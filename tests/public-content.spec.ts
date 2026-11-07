import { test, expect } from "./fixtures";

test("unsupported testimonials, awards, and article links are absent from API and public source", async ({
  page,
  request,
}) => {
  for (const [name, key] of [
    ["testimonials", "testimonials"],
    ["achievements", "achievements"],
    ["blog", "blogs"],
  ]) {
    const response = await request.get("/profile/" + name + ".json");
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ [key]: [] });
  }
  const portfolio = await (await request.get("/api/portfolio")).json();
  expect(portfolio.testimonials).toEqual([]);
  expect(portfolio.achievements).toEqual([]);
  expect(portfolio.blogs).toEqual([]);
  for (const path of ["/testimonials", "/achievements", "/blog"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.locator("main").innerText()).not.toMatch(
      /Sarah Johnson|Michael Chen|AWS Certified|META-REACT|40% increase/,
    );
    await expect(
      page.locator('main a[href="/projects"]').first(),
    ).toBeVisible();
  }
});
