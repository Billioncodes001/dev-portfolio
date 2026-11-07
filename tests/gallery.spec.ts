import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test("gallery images, keyboard dialog, and leadership links work", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery");
  await expect(page).toHaveTitle("Gallery | Comr. Josiah Adeyemo");
  await expect(page.locator(".gallery-item")).toHaveCount(4);
  const content = await (await page.request.get("/api/portfolio")).json();
  expect(
    content.leadership.find(
      (entry: { title: string }) =>
        entry.title === "Assistant General Secretary",
    ).period,
  ).toBe("2025");
  expect(
    content.leadership.find(
      (entry: { title: string }) =>
        entry.title === "Zonal Coordinator — Southwest Zone D",
    ).period,
  ).toBe("2026");
  for (const image of await page.locator(".gallery-image img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  const opener = page.getByRole("button", {
    name: "Enlarge The person behind the code",
  });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close image" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await opener.click();
  await page.getByRole("button", { name: "Close image" }).click();
  await expect(opener).toBeFocused();
  await page.screenshot({
    path: `test-results/${info.project.name}-gallery.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Read the story" }).click();
  await expect(page.locator("#leadership")).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "NANS executive directory" }),
  ).toHaveAttribute("href", "https://nanssouthwest.org.ng/executives");
});

test("biography and gallery are accessible and fit small screens", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of info.project.name === "mobile"
    ? [320, 390]
    : [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/about", "/experience", "/gallery"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  for (const path of ["/about", "/experience", "/gallery"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  }
  await page
    .getByRole("button", { name: "Enlarge The person behind the code" })
    .click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
