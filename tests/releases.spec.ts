import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test("release maturity filters and review evidence work without deployment claims", async ({
  page,
}, info) => {
  await page.goto("/projects");
  await page.getByLabel("Release maturity").selectOption("private-pilot");
  await expect(page.locator(".project-card").first()).toBeVisible();
  for (const badge of await page.locator(".project-card .release-badge").all())
    await expect(badge).toHaveText("Private pilot");
  await page
    .getByRole("link", { name: "Explore Korpeatech", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "What you can use." }),
  ).toBeVisible();
  await expect(
    page.getByText("No public deployment verified", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Reviewed source:/ }),
  ).toHaveAttribute("href", /github\.com\/[^/]+\/[^/]+\/commit\/[a-f0-9]{40}$/);
  expect(
    (await new AxeBuilder({ page }).include(".release-sheet").analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".release-sheet").screenshot({
    path: "test-results/" + info.project.name + "-release-evidence.png",
    // Keep the fixed header outside this tall component-only capture.
    style: ".site-header { visibility: hidden !important; }",
  });
});
