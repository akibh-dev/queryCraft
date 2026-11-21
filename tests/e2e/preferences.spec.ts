import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const tutorial = "/levels/w1-l1-needle-in-a-million";
const next = "/levels/w1-l2-name-collision";
test("settings persist, clearing requires confirmation, and imports preview before applying", async ({
  page,
}) => {
  await page.goto(tutorial);
  await page.getByRole("checkbox", { name: "users.email" }).check();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await page.getByRole("button", { name: "Submit solution" }).click();
  await expect(page).toHaveURL(`${tutorial}/debrief`);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.getByRole("checkbox", { name: "Reduce motion" }).check();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("querycraft.progress.v1") ?? "{}")
            .settings,
      ),
    )
    .toEqual({ theme: "light", reduceMotion: true });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduce-motion",
    "true",
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  const path = await (await downloaded).path();
  if (!path) throw Error("Missing progress download");
  const data = await readFile(path);
  const clear = page.getByRole("button", { name: "Clear progress" });
  await clear.click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(clear).toBeFocused();
  await clear.click();
  await page.getByRole("button", { name: "Confirm clear" }).click();
  await expect(clear).toBeFocused();
  const input = page.getByLabel("Progress file");
  await input.setInputFiles({
    name: "saved.json",
    mimeType: "application/json",
    buffer: data,
  });
  await expect(
    page.getByText("After import you will have 1 saved completion record."),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Apply import" }).click();
  for (const [content, expected] of [
    [Buffer.from("{"), "This file is not valid JSON"],
    [Buffer.alloc(262145, 65), "Choose a file of 256 KiB or less."],
    [
      Buffer.from('{"schemaVersion":99}'),
      "This file contains invalid or unsupported progress",
    ],
  ] as const) {
    await input.setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: content,
    });
    await expect(page.getByText(expected, { exact: false })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Apply import" }),
    ).toHaveCount(0);
  }
  await page.goto(next);
  await expect(
    page.getByRole("checkbox", { name: "contacts.name" }),
  ).toBeVisible();
});
test("a blocked save allows session-only play and export", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage disabled", "QuotaExceededError");
    };
  });
  await page.goto(tutorial);
  await page.getByRole("checkbox", { name: "users.email" }).check();
  await page.getByRole("button", { name: "Run simulation" }).click();
  await page.getByRole("button", { name: "Submit solution" }).click();
  await expect(
    page.getByText(/Progress is available for this session/),
  ).toBeVisible();
  await page.getByRole("link", { name: "Next level" }).click();
  await expect(
    page.getByRole("checkbox", { name: "contacts.name" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  expect((await downloaded).suggestedFilename()).toBe(
    "querycraft-progress.json",
  );
});
