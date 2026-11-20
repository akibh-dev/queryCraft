import { expect, test } from "@playwright/test";

test("a failed run, a passing run and a fresh submission unlock the next level", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: "Play", exact: true }).click();
  const name = page.getByRole("checkbox", { name: "users.name" });
  const email = page.getByRole("checkbox", { name: "users.email" });
  const run = page.getByRole("button", { name: "Run simulation" });
  const submit = page.getByRole("button", { name: "Submit solution" });
  await name.check();
  await run.click();
  await expect(submit).toBeDisabled();
  await page.getByRole("button", { name: "Compare runs" }).click();
  await name.uncheck();
  await email.check();
  await run.click();
  await expect(submit).toBeEnabled();
  await name.check();
  await name.uncheck();
  await expect(submit).toBeDisabled();
  await run.click();
  await submit.click();
  await expect(
    page.getByRole("heading", { name: "Level complete" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Next level" }).click();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "contacts.name" }),
  ).toBeVisible();
});
