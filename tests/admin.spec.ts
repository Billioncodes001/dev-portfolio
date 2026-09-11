import { test, expect } from "@playwright/test";

test("private review keeps tokens memory-only and renders contact text without HTML execution", async ({
  page,
}) => {
  const token = "test-only-memory-token-not-real-credentials";
  let authorization = "";
  await page.route("**/api/admin/messages?*", async (route) => {
    authorization = route.request().headers().authorization;
    await route.fulfill({
      json: {
        messages: [
          {
            name: "Private fixture",
            email: "test@example.com",
            service: "Collaboration",
            created_at: "2026-09-11",
            message: "<img src=x onerror=alert(1)>",
          },
        ],
      },
    });
  });
  await page.goto("/contact-review.html");
  await page.getByLabel("Admin token", { exact: true }).fill(token);
  await page.getByRole("button", { name: "Unlock inbox" }).click();
  await expect(
    page.getByRole("heading", { name: "Private fixture" }),
  ).toBeVisible();
  expect(authorization).toBe("Bearer " + token);
  await expect(page.locator("#token")).toHaveValue("");
  await expect(page.locator("#messages img")).toHaveCount(0);
  await expect(page.locator("#messages")).toContainText(
    "<img src=x onerror=alert(1)>",
  );
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.getByRole("button", { name: "Lock and clear" }).click();
  await expect(page.locator("#messages")).toBeEmpty();
  await expect(page.getByRole("status")).toHaveText("Locked.");
  await page.reload();
  await expect(page.locator("#token")).toHaveValue("");
  await expect(page.locator("#messages")).toBeEmpty();
});
