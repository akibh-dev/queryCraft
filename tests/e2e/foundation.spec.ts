import { expect, test } from "@playwright/test";

const firstLevel = "/levels/w1-l1-needle-in-a-million";
const tutorial = "Needle in a Million";

test("shared navigation, keyboard activation and browser history", async ({
  page,
}) => {
  await page.goto("/");
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveText("Make a slow query faster.");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Play" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(firstLevel);
  await expect(h1).toHaveText(tutorial);
  await expect(h1).toBeFocused();
  await page.getByRole("link", { name: "Back to level map" }).click();
  await expect(h1).toHaveText("Level map");
  await page.getByRole("link", { name: "Open level" }).click();
  await expect(h1).toHaveText(tutorial);
  for (const [label, title] of [
    ["Settings", "Settings"],
    ["Model assumptions", "Model assumptions"],
    ["Levels", "Level map"],
  ]) {
    const link = page
      .getByRole("navigation")
      .getByRole("link", { name: label });
    await link.click();
    await expect(page).toHaveTitle(`${title} | QueryCraft`);
    await expect(link).toHaveAttribute("aria-current", "page");
  }
  await page.goBack();
  await expect(h1).toHaveText("Model assumptions");
  await page.goForward();
  await expect(h1).toHaveText("Level map");
  await page.getByRole("link", { name: "QueryCraft" }).click();
  await page.getByRole("link", { name: "View levels" }).click();
  await expect(h1).toHaveText("Level map");
});

test("deep links and recovery at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const [path, title] of [
    [`${firstLevel}/debrief`, "Level debrief"],
    ["/levels/w1-l2-name-collision", "Name Collision"],
    ["/levels/unknown", "Level not found"],
    ["/unknown", "Page not found"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} | QueryCraft`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    if (title === "Name Collision")
      await expect(
        page.getByText(
          "Locked. Complete Needle in a Million to unlock this level.",
        ),
      ).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
    await page.getByRole("link", { name: "Back to level map" }).click();
    await expect(page).toHaveURL("/levels");
  }
  await page.goto(`${firstLevel}/debrief`);
  await page.getByRole("link", { name: "Open level" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: tutorial })).toBeVisible();
});
