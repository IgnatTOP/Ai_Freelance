import { expect, test } from "@playwright/test";

test("app root loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expect(response?.ok()).toBe(true);
});
