import { expect, test } from "@playwright/test";

test("the built application loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "QueryCraft" })).toBeVisible();
});
