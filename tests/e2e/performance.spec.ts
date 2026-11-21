import { gzipSync } from "node:zlib";
import { expect, type Response, test } from "@playwright/test";

const viewport = { width: 390, height: 844 };
const deviceScaleFactor = 3;
const cpuSlowdown = 4;
const gzipBudgetBytes = 250 * 1024;
const runTargetMs = 200;
const runCount = 9;
const runMeasure = "querycraft-run-to-results";

test.use({ viewport, deviceScaleFactor, isMobile: true, hasTouch: true });

test("measure production load and mobile simulation performance", async ({
  browser,
  browserName,
  context,
  page,
}, testInfo) => {
  test.skip(browserName !== "chromium", "CPU throttling requires Chromium CDP");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuSlowdown });

  const responses = new Map<string, Response>();
  function recordAsset(response: Response) {
    const type = response.request().resourceType();
    if (type === "script" || type === "stylesheet") {
      responses.set(response.url(), response);
    }
  }
  page.on("response", recordAsset);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make a slow query faster." }),
  ).toBeVisible();
  await page.waitForFunction(
    () =>
      performance.getEntriesByName("first-contentful-paint", "paint").length,
  );
  page.off("response", recordAsset);

  const loadTimes = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const [firstContentfulPaint] = performance.getEntriesByName(
      "first-contentful-paint",
      "paint",
    );
    return {
      domContentLoadedMs: navigation.domContentLoadedEventEnd,
      loadMs: navigation.loadEventEnd,
      firstContentfulPaintMs: firstContentfulPaint.startTime,
    };
  });
  const assets = await Promise.all(
    [...responses.values()].map(async (response) => {
      expect(response.ok()).toBe(true);
      return {
        path: new URL(response.url()).pathname,
        type: response.request().resourceType(),
        gzipBytes: gzipSync(await response.body()).byteLength,
      };
    }),
  );
  expect(assets.map((asset) => asset.type)).toEqual(
    expect.arrayContaining(["script", "stylesheet"]),
  );
  const totalGzipBytes = assets.reduce(
    (sum, asset) => sum + asset.gzipBytes,
    0,
  );

  await page.getByRole("link", { name: "Play", exact: true }).tap();
  const run = page.getByRole("button", { name: "Run simulation" });
  const resultsTab = page.getByRole("tab", { name: "Results" });
  const panelId = await resultsTab.getAttribute("aria-controls");
  const latestRun = page.getByRole("heading", { name: "Latest run" });
  const runTimesMs: number[] = [];

  for (let sample = 0; sample < runCount; sample++) {
    if (sample > 0) {
      await page.getByRole("tab", { name: "Workbench" }).tap();
      await page.getByRole("button", { name: "Reset attempt" }).tap();
    }
    await page.getByRole("checkbox", { name: "users.email" }).tap();
    await expect(resultsTab).toHaveAttribute("aria-selected", "false");

    await run.evaluate(
      (button, { id, name }) => {
        const panel = document.getElementById(id ?? "");
        if (!panel) throw new Error("The Results tab has no panel.");
        performance.clearMeasures(name);
        button.addEventListener(
          "pointerdown",
          (event) => {
            const observer = new MutationObserver(() => {
              const heading = panel.querySelector("h2");
              if (
                panel.hidden ||
                heading?.textContent?.trim() !== "Latest run"
              ) {
                return;
              }
              observer.disconnect();
              // A rendering opportunity for the new panel falls between frames.
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  performance.measure(name, { start: event.timeStamp });
                });
              });
            });
            observer.observe(panel, {
              attributes: true,
              attributeFilter: ["hidden"],
              childList: true,
              subtree: true,
            });
          },
          { once: true },
        );
      },
      { id: panelId, name: runMeasure },
    );
    await run.tap();
    await expect(latestRun).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit solution" }),
    ).toBeEnabled();
    await page.waitForFunction(
      (name) => performance.getEntriesByName(name, "measure").length,
      runMeasure,
    );
    runTimesMs.push(
      await page.evaluate(
        (name) => performance.getEntriesByName(name, "measure")[0].duration,
        runMeasure,
      ),
    );
  }

  const sortedRunTimes = [...runTimesMs].sort((a, b) => a - b);
  const maxRunMs = Math.max(...runTimesMs);
  await testInfo.attach("production-performance", {
    contentType: "application/json",
    body: JSON.stringify(
      {
        profile: {
          browser: `${browserName} ${browser.version()}`,
          viewport,
          deviceScaleFactor,
          touch: true,
          cpuSlowdown,
        },
        initialLoad: {
          path: "/",
          ...loadTimes,
          assets,
          totalGzipBytes,
          gzipBudgetBytes,
        },
        simulation: {
          method:
            "Touch pointerdown through two animation frames after Results opens with Latest run on the first level. Reset between samples.",
          runTimesMs,
          medianRunMs: sortedRunTimes[Math.floor(sortedRunTimes.length / 2)],
          maxRunMs,
          runTargetMs,
          withinTarget: maxRunMs <= runTargetMs,
        },
      },
      null,
      2,
    ),
  });

  // Timing is recorded for release review because CI host load varies.
  expect(totalGzipBytes).toBeLessThanOrEqual(gzipBudgetBytes);
});
