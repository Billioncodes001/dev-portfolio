import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("new GitHub projects refresh in place, and failures preserve a contact draft", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const original = await (await page.request.get("/api/portfolio")).json();
  const repository = {
    id: 12345,
    name: "a-new-project",
    fullName: "billioncodes001/a-new-project",
    url: "https://github.com/billioncodes001/a-new-project",
    description: "A newly published project.",
    language: "TypeScript",
    topics: ["angular"],
    stars: 0,
    updatedAt: "2026-09-10T12:00:00Z",
  };
  const project = {
    title: "A New Project",
    bodyText: repository.description,
    source: "github",
    repository,
    slug: "github-12345",
    tags: ["TypeScript", "angular"],
    links: [{ text: "GitHub", href: repository.url }],
  };
  let calls = 0,
    fail = false,
    expanded = false;
  await page.route("**/api/portfolio", (route) => {
    calls++;
    return fail
      ? route.fulfill({ status: 503, body: "{}" })
      : route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            ...original,
            projects: [
              ...original.projects,
              project,
              ...(expanded
                ? [
                    {
                      ...project,
                      title: "Another Public Project",
                      slug: "github-12346",
                      repository: {
                        ...repository,
                        id: 12346,
                        name: "another-project",
                        fullName: "billioncodes001/another-project",
                      },
                    },
                  ]
                : []),
            ],
            github: {
              username: "billioncodes001",
              status: "live",
              syncedAt: "2026-09-10T12:00:00Z",
              repositories: expanded ? 2 : 1,
            },
          }),
        });
  });
  await page.goto("/projects");
  await expect(page.getByText("Fresh from GitHub")).toBeVisible();
  await expect(page.locator(".project-card")).toHaveCount(
    original.projects.length + 1,
  );
  await page.getByRole("button", { name: "GitHub", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  expanded = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".project-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "GitHub", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("link", { name: "Explore A New Project", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("A New Project");
  await expect(
    page.getByRole("heading", { name: "Review pending." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Reviewed source:/ }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".detail-grid")
      .getByRole("link", { name: "GitHub", exact: true }),
  ).toHaveAttribute("href", repository.url);
  await page.goto("/contact");
  await page
    .getByRole("textbox", { name: "Your name" })
    .fill("Keep this draft");
  const previousCalls = calls;
  fail = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => calls).toBeGreaterThan(previousCalls);
  await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
    "Keep this draft",
  );
  await expect(
    page.getByRole("heading", { name: "Let's try that again." }),
  ).toHaveCount(0);
});
