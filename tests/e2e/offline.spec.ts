import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

async function controlled(page: Page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

test("a cached build solves an unvisited puzzle offline and retains its unlock after reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await controlled(page);
  await context.setOffline(true);
  await page.goto("/levels/w1-l1-needle-in-a-million");
  await page.getByRole("checkbox", { name: "users.email" }).check();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await page.getByRole("button", { name: "Submit solution" }).click();
  await page.getByRole("link", { name: "Next level" }).click();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "contacts.name" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () => (await fetch("/assets/missing-script.js")).status,
    ),
  ).toBe(404);
});

test("a waiting build preserves open tabs and saved settings until explicit reload", async ({
  context,
  page,
}) => {
  const temp = await mkdtemp(join(tmpdir(), "querycraft-update-"));
  const original = join(process.cwd(), "dist");
  await cp(original, temp, { recursive: true });
  const html = await readFile(join(temp, "index.html"), "utf8");
  const buildVersion = html.match(
    /name="querycraft-build" content="([a-f0-9]+)"/,
  )?.[1];
  if (!buildVersion) throw new Error("Missing production build version");
  await writeFile(
    join(temp, "index.html"),
    html
      .replace(buildVersion, "__QUERYCRAFT_BUILD__")
      .replace("<title>", "<!-- updated build -->\n<title>"),
  );
  execFileSync(process.execPath, ["scripts/build-offline.mjs", temp]);
  let root = original;
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webmanifest": "application/manifest+json",
  };
  const server = createServer(async (req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const name = path === "/" || !extname(path) ? "index.html" : path.slice(1);
    try {
      const data = await readFile(join(root, name));
      res.writeHead(200, {
        "content-type": types[extname(name)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing preview address");
    const origin = `http://127.0.0.1:${address.port}`;
    await page.goto(`${origin}/settings`);
    await controlled(page);
    await page.getByRole("radio", { name: "Light" }).check();
    const other = await context.newPage();
    await other.goto(`${origin}/levels/w1-l1-needle-in-a-million`);
    await controlled(other);
    await other.getByRole("checkbox", { name: "users.email" }).check();
    root = temp;
    await page.evaluate(async () =>
      (await navigator.serviceWorker.ready).update().then(() => undefined),
    );
    const reload = page.getByRole("button", { name: "Reload to update" });
    await reload.click();
    await expect(
      page.getByText(/Close the other QueryCraft tabs/),
    ).toBeVisible();
    await expect(
      other.getByRole("checkbox", { name: "users.email" }),
    ).toBeChecked();
    await other.close();
    await reload.click();
    await expect(
      page.locator('meta[name="querycraft-build"]'),
    ).not.toHaveAttribute("content", buildVersion);
    await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
    await expect(reload).toHaveCount(0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    await rm(temp, { recursive: true, force: true });
  }
});
