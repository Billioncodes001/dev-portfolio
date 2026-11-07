import { test, expect } from "@playwright/test";
import { front } from "./fixtures";

test("first visit boots, locks, and unlocks into the desktop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // The boot lasts about a second, so record it as it happens rather than
  // racing a visibility check against it on a busy machine.
  await page.addInitScript(() => {
    new MutationObserver((_, observer) => {
      if (document.querySelector(".os-boot")) {
        (window as Window & { sawBoot?: boolean }).sawBoot = true;
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await expect(
    page.getByRole("list", { name: "Notifications" }).getByRole("button"),
  ).not.toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as Window & { sawBoot?: boolean }).sawBoot,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("list", { name: "Notifications" }).getByRole("button"),
  ).not.toHaveCount(0);
  await expect(page.getByText(/You've reached/)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: /Thoughtful code/ }),
  ).toBeVisible();
  // A returning visitor in the same tab skips straight to the desktop.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Thoughtful code/ }),
  ).toBeVisible();
  await expect(page.getByText(/You've reached/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a lock-screen notification opens its page", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("list", { name: "Notifications" })
    .getByRole("button", { name: /Leave Josiah a note/ })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole("textbox", { name: "Your name" })).toBeVisible();
});

test("deep links skip the boot and windows keep the URL in sync", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "Phones show one app at a time");
  await page.goto("/projects");
  await expect(page.getByText(/You've reached/)).toHaveCount(0);
  await expect(front(page)).toHaveAccessibleName("Work");
  await page
    .getByRole("list", { name: "Apps" })
    .getByRole("button", { name: "About", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator(".os-window")).toHaveCount(2);
  await page.goBack();
  await expect(front(page)).toHaveAccessibleName("Work");
  await page.goForward();
  await expect(front(page)).toHaveAccessibleName("About");
  await page.getByRole("button", { name: "Close About" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(front(page)).toHaveAccessibleName("Work");
  await expect(page.locator(".os-window")).toHaveCount(1);
});

test("windows drag, maximise, and minimise to the dock", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "Phones open apps full screen");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  const win = front(page);
  const before = await win.boundingBox();
  const bar = win.locator(".os-titlebar h2");
  const start = await bar.boundingBox();
  await page.mouse.move(start!.x + 5, start!.y + 5);
  await page.mouse.down();
  await page.mouse.move(start!.x + 85, start!.y + 65, { steps: 6 });
  await page.mouse.up();
  const after = await win.boundingBox();
  expect(Math.round(after!.x - before!.x)).toBe(80);
  expect(Math.round(after!.y - before!.y)).toBe(60);
  await page.getByRole("button", { name: "Maximise About" }).click();
  await expect(win).toHaveClass(/is-max/);
  await page.getByRole("button", { name: "Restore About" }).click();
  await page.getByRole("button", { name: "Minimise About" }).click();
  await expect(page.locator(".os-window.is-min")).toHaveCount(1);
  await page
    .getByRole("list", { name: "Apps" })
    .getByRole("button", { name: "About", exact: true })
    .click();
  await expect(page.locator(".os-window.is-min")).toHaveCount(0);
  await expect(page).toHaveURL(/\/about$/);
});

test("terminal commands explore the portfolio", async ({ page }, info) => {
  await page.goto("/about");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page
      .getByRole("list", { name: "Apps" })
      .getByRole("button", { name: "Terminal", exact: true })
      .click();
  } else
    await page
      .getByRole("navigation", { name: "Dock" })
      .getByRole("button", { name: /^Terminal/ })
      .click();
  const shell = page.getByRole("textbox", { name: "Terminal command" });
  await expect(shell).toBeFocused();
  await shell.fill("whoami");
  await shell.press("Enter");
  await expect(page.locator(".term-out").last()).toContainText(
    "Comr. Josiah Adeyemo",
  );
  await shell.fill("nope");
  await shell.press("Enter");
  await expect(page.locator(".term-err")).toContainText("command not found");
  await shell.fill("neofe");
  await shell.press("Tab");
  await expect(shell).toHaveValue("neofetch ");
  await shell.press("Enter");
  await expect(page.locator(".term-fetch")).toContainText("josiahadeyemo.me");
  await shell.press("ArrowUp");
  await expect(shell).toHaveValue("neofetch ");
  await shell.fill("open osint-neural");
  await shell.press("Enter");
  await expect(page).toHaveURL(/\/projects\/osint-neural$/);
  await expect(front(page).locator("h1")).toHaveText("OSINT / Neural");
});

test("the launcher searches apps and projects from the keyboard", async ({
  page,
}, info) => {
  await page.goto("/about");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page.getByRole("button", { name: "Search", exact: true }).click();
  } else await page.getByRole("button", { name: /^Search/ }).click();
  const field = page.getByRole("combobox", {
    name: "Search apps and projects",
  });
  await expect(field).toBeFocused();
  await field.fill("korpeatech");
  await expect(page.getByRole("option").first()).toContainText("Korpeatech");
  await field.press("Enter");
  await expect(page).toHaveURL(/\/projects\/korpeatech/);
  await expect(field).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+k");
  await expect(field).toBeFocused();
  await field.fill("zzzz-nothing");
  await expect(page.getByText('Nothing matches "zzzz-nothing".')).toBeVisible();
  await field.press("Escape");
  await expect(field).toHaveCount(0);
});

test("Calendar books a meeting straight into Mail", async ({ page }, info) => {
  await page.goto("/contact");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await page
      .getByRole("list", { name: "Apps" })
      .getByRole("button", { name: "Calendar", exact: true })
      .click();
  } else
    await page
      .getByRole("navigation", { name: "Dock" })
      .getByRole("button", { name: /^Calendar/ })
      .click();
  const book = page.getByRole("button", { name: "Book a meeting" });
  await expect(book).toBeEnabled();
  await book.click();
  await expect(page).toHaveURL(/\/contact\?meeting=/);
  await expect(
    page.getByRole("textbox", { name: "A little about your idea" }),
  ).toHaveValue(/I'd like to book a call on /);
});

test("Safari opens projects as tabs, live where they allow it", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "Covered by the desktop layout");
  // Deep links are served by the app (not the static index), so they must
  // carry the frame-src that lets the live tab load.
  for (const path of ["/", "/about", "/projects/osint-neural"]) {
    const csp = (await page.request.get(path)).headers()[
      "content-security-policy"
    ];
    expect(csp, path).toMatch(
      /frame-src [^;]*https:\/\/osint-neural-atlas\.pages\.dev/,
    );
  }
  await page.goto("/about");
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: /^Safari/ })
    .click();
  const tabs = page.getByRole("tablist", { name: "Projects" });
  await expect(tabs.getByRole("tab").first()).toHaveText("Favorites");
  await expect(
    page.locator("iframe[title='OSINT / Neural (live site)']"),
  ).toHaveAttribute("src", "https://osint-neural-atlas.pages.dev/");
  await tabs.getByRole("tab", { name: "Favorites" }).click();
  await page.getByRole("button", { name: "Korpeatech", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Read the case study" }),
  ).toBeVisible();
});

test("music follows the visitor's mute choice", async ({ page }, info) => {
  test.skip(
    info.project.name === "mobile",
    "The sound switch is in the menu bar",
  );
  await page.goto("/about");
  const mute = page.getByRole("button", { name: "Mute music" });
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await mute.click();
  await expect(
    page.getByRole("button", { name: "Play music" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("button", { name: "Play music" })).toBeVisible();
});
