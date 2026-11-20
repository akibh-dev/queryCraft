import { expect, test } from "@playwright/test";
import { catalog } from "../../src/content";
import { references } from "../../src/content/testing/references";

for (const width of [390, 1440]) {
  test(`solve and reopen the complete campaign at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("link", { name: "Play", exact: true }).click();
    for (const [i, { level }] of catalog.entries()) {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        level.title,
      );
      await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
      for (const index of level.indexOptions) {
        await page
          .getByRole("checkbox", {
            name: `${level.table.name}.${index.column}`,
          })
          .setChecked(references[i].winning.includes(index.id));
      }
      await page.getByRole("button", { name: "Run simulation" }).click();
      await page.getByRole("button", { name: "Submit solution" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Level complete",
      );
      await expect(
        page.getByText("3 of 3 stars", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("link", {
          name: i < catalog.length - 1 ? "Next level" : "View completed levels",
        })
        .click();
    }
    await page.reload();
    await expect(page.getByText("6 of 6 complete")).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "View completed levels" }),
    ).toHaveAttribute("href", "/levels");
  });
}
