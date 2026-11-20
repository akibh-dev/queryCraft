import { expect, type Locator, type Page, test } from "@playwright/test";

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 45; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Keyboard focus could not reach the requested control.");
}
test("keyboard actions, hints and stale-run handling in the phone workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await tabTo(page, page.getByRole("link", { name: "Play", exact: true }));
  await page.keyboard.press("Enter");
  const workbench = page.getByRole("tab", { name: "Workbench" });
  await tabTo(page, workbench);
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Brief" })).toBeFocused();
  await tabTo(page, page.getByRole("button", { name: "Show hint" }));
  for (let i = 0; i < 3; i++) await page.keyboard.press("Enter");
  await expect(page.getByText("All hints shown")).toBeVisible();
  await tabTo(page, page.getByRole("tab", { name: "Brief" }));
  await page.keyboard.press("ArrowRight");
  await tabTo(page, page.getByRole("checkbox", { name: "users.name" }));
  await page.keyboard.press("Space");
  const run = page.getByRole("button", { name: "Run simulation" });
  await tabTo(page, run);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tab", { name: "Results" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("status")).toContainText("Below target");
  await tabTo(page, page.getByRole("tab", { name: "Results" }));
  await page.keyboard.press("ArrowLeft");
  await tabTo(page, page.getByRole("button", { name: "Reset attempt" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("checkbox", { name: "users.name" }),
  ).not.toBeChecked();
  await tabTo(page, page.getByRole("checkbox", { name: "users.email" }));
  await page.keyboard.press("Space");
  await tabTo(page, run);
  await page.keyboard.press("Enter");
  await tabTo(page, page.getByRole("button", { name: "Submit solution" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Level complete" }),
  ).toBeFocused();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
});
test("draft survives a visit to the model and browser Back", async ({
  page,
}) => {
  await page.goto("/levels/w1-l1-needle-in-a-million");
  await page.getByRole("checkbox", { name: "users.email" }).check();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Model assumptions" })
    .click();
  await page.goBack();
  await expect(
    page.getByRole("checkbox", { name: "users.email" }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Submit solution" }),
  ).toBeEnabled();
});

test("the longest challenge fits small screens and enlarged text", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const key = "querycraft.progress.v1";
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        settings: { theme: "light", reduceMotion: true },
        completions: [
          {
            levelId: "w1-l5-the-common-case",
            levelVersion: 1,
            modelVersion: "mvp-1",
            selectedIndexIds: [],
            stars: 3,
          },
        ],
      }),
    );
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/levels/w1-l6-price-of-an-index");
    await expect(
      page.getByRole("heading", { name: "The Price of an Index" }),
    ).toBeVisible();
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await page.getByRole("button", { name: "Run simulation" }).click();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
  }
});
