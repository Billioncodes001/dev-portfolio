import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test("home renders complete content, intact images, and no horizontal overflow", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Thoughtful code/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /OSINT \/ Neural/ }),
  ).toBeVisible();
  for (const image of await page.locator("img").all())
    await image.scrollIntoViewIfNeeded();
  await page.locator(".contact-banner").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/" + info.project.name + "-home.png",
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await page.screenshot({
    path: "test-results/" + info.project.name + "-hero.png",
    animations: "disabled",
    scale: "css",
  });
});

test("project filters, search, and deep-link reload work", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.locator(".project-card")).toHaveCount(18);
  await page.getByRole("button", { name: "Python", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Search projects" })
    .fill("not-a-real-project");
  await expect(
    page.getByRole("heading", { name: "No matches this time." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".project-card")).toHaveCount(18);
  await page
    .getByRole("link", { name: "Explore Korpeatech", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: /Korpeatech/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Under the surface." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("contact validation and submission reach the real backend", async ({
  page,
}, info) => {
  await page.goto("/contact");
  await page.screenshot({
    path: "test-results/" + info.project.name + "-contact.png",
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByText("Please enter your name.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your name" })).toBeFocused();
  await page
    .getByRole("textbox", { name: "Your name" })
    .fill("Local browser test " + info.project.name);
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("local-test@example.com");
  await page.getByRole("radio", { name: "Backend & APIs" }).check();
  await page
    .getByRole("textbox", { name: "A little about your idea" })
    .fill(
      "This is a local automated test. Please ignore this portfolio submission.",
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText("Message received", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send another message" }).click();
  await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
    "",
  );
});

test("contact errors preserve the draft for a retry", async ({ page }) => {
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Please try again." }),
    }),
  );
  await page.goto("/contact");
  await page
    .getByRole("textbox", { name: "Your name" })
    .fill("Draft preservation test");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("local-test@example.com");
  await page
    .getByRole("textbox", { name: "A little about your idea" })
    .fill(
      "A useful message that must remain available after a failed request.",
    );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Please try again.");
  await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
    "Draft preservation test",
  );
});

test("all routes render and recover from unknown pages", async ({ page }) => {
  for (const path of [
    "/about",
    "/experience",
    "/skills",
    "/education",
    "/blog",
    "/achievements",
    "/testimonials",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByText("A small interruption")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/a-missing-page");
  await expect(
    page.getByRole("heading", { name: "This page took a wrong turn." }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Back to home", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Thoughtful code/ }),
  ).toBeVisible();
});

test("navigation works at each viewport and theme choice persists", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Thoughtful code/ }),
  ).toBeVisible();
  if (info.project.name === "mobile") {
    // Phones get a home screen: back out of Welcome, then tap an app.
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page
      .getByRole("list", { name: "Apps" })
      .getByRole("button", { name: "About", exact: true })
      .click();
  } else
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "About", exact: true })
      .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { name: "Engineer. Builder. Human." }),
  ).toBeVisible();
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByRole("list", { name: "Apps" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "test-results/" + info.project.name + "-about-dark.png",
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
});

test("content errors offer a working retry", async ({ page }) => {
  let failed = true;
  await page.route("**/api/portfolio", (route) =>
    failed ? route.fulfill({ status: 503, body: "{}" }) : route.continue(),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  failed = false;
  await page.getByRole("button", { name: "Reload portfolio" }).click();
  await expect(
    page.getByRole("heading", { name: /Thoughtful code/ }),
  ).toBeVisible();
});

test("key pages pass automated accessibility checks in both themes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/projects", "/contact"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((issue) => ({
          id: issue.id,
          nodes: issue.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
        path + " " + theme,
      ).toEqual([]);
    }
  }
});

test("layouts remain usable across narrow phones, tablets, and wide screens", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const widths =
    info.project.name === "mobile" ? [320, 375, 430] : [600, 768, 1024, 1920];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/projects", "/about", "/contact"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      const overflow = await page.evaluate(() => ({
        width: innerWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(
        overflow.content,
        path + " at " + width + "px",
      ).toBeLessThanOrEqual(overflow.width);
    }
  }
});
