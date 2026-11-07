import { test, expect } from "./fixtures";

test("private-source case studies have working previews and never promise public source", async ({
  page,
}) => {
  await page.goto("/projects");
  await expect(page.getByText("Private source", { exact: true })).toHaveCount(
    4,
  );
  await page.getByLabel("Release maturity").selectOption("private-source");
  await expect(page.locator(".project-card")).toHaveCount(4);
  await page.getByLabel("Release maturity").selectOption("");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "MyMecho", exact: true }),
  ).toBeVisible();
  for (const slug of ["osint-neural", "vantage", "overlay-studio", "mymecho"]) {
    await page.goto(`/projects/${slug}`);
    await expect(
      page.getByRole("heading", {
        name: "A closer look, without exposing the source.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Review pending." }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Case study", exact: true }),
    ).toHaveAttribute(
      "href",
      `https://github.com/Billioncodes001/dev-portfolio/blob/main/docs/projects/${slug}.md`,
    );
    for (const image of await page.locator("main img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element) => (element as HTMLImageElement).naturalWidth,
          ),
        )
        .toBeGreaterThan(0);
    }
    await expect(
      page.getByRole("link", { name: /Reviewed source:/ }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
