import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { loadRepositoryPreviews } from "../server/content";
import { mergeProjects } from "../server/github";
import { repositorySchema } from "../shared/schema";

test("curated and discovered screenshots load on Work and project details", async ({
  page,
}, testInfo) => {
  const original = await (await page.request.get("/api/portfolio")).json();
  const previews = await loadRepositoryPreviews(resolve("public"));
  const repositories = Object.keys(previews).map((fullName, index) =>
    repositorySchema.parse({
      id: 901 + index,
      name: fullName.split("/")[1],
      fullName,
      url: "https://github.com/" + fullName,
      description: "A public project with a reviewed interface screenshot.",
      language: "TypeScript",
      topics: [],
      stars: 0,
      updatedAt: "2026-09-10T12:00:00Z",
    }),
  );
  const projects = mergeProjects(original.projects, repositories, previews);
  await page.route("**/api/portfolio", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...original, projects }),
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const title of [
    "Polytechnic Students Record System",
    "App Launch Inspector",
    "Social Claim Verifier",
    "X Browser Mcp",
  ]) {
    await page.goto("/projects");
    await page.getByRole("searchbox", { name: "Search projects" }).fill(title);
    await expect(page.locator(".project-card")).toHaveCount(1);
    const preview = page.getByRole("img", {
      name: title + " interface preview",
    });
    await expect(preview).toBeVisible();
    await expect
      .poll(() =>
        preview.evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(page.locator(".project-placeholder")).toHaveCount(0);
    const src = await preview.getAttribute("src");
    const response = await page.request.get(src!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/webp");
    if (title === "Social Claim Verifier")
      await page.screenshot({
        path: testInfo.outputPath("social-preview.png"),
        fullPage: true,
      });
    await page
      .getByRole("link", { name: "Explore " + title, exact: true })
      .click();
    await expect(page.locator("h1")).toHaveText(title);
    await expect(preview).toBeVisible();
  }
});
