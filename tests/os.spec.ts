import { test, expect, type Page } from "@playwright/test";
import { front } from "./fixtures";
import { FRAME_SOURCES } from "../shared/embeds";

/** Phones land on the home screen with nothing open; desktops open Welcome. */
async function expectLanded(page: Page, project: string) {
  if (project === "mobile") {
    await expect(page.getByRole("list", { name: "Apps" })).toBeVisible();
    await expect(page.locator(".os-window")).toHaveCount(0);
  } else
    await expect(
      page.getByRole("heading", { name: /Thoughtful code/ }),
    ).toBeVisible();
}

test("first visit boots, locks, and unlocks into the desktop", async ({
  page,
}, info) => {
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
  await expectLanded(page, info.project.name);
  // A returning visitor in the same tab skips straight to the desktop.
  await page.reload();
  await expectLanded(page, info.project.name);
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

test("Safari tabs load each project's own link, or say where it opens", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "Covered by the desktop layout");
  // Deep links are served by the app (not the static index), so they must
  // carry every frame source the Safari tabs can load.
  for (const path of ["/", "/about", "/projects/osint-neural"]) {
    const csp = (await page.request.get(path)).headers()[
      "content-security-policy"
    ];
    for (const source of FRAME_SOURCES)
      expect(csp, path + " " + source).toContain(source);
  }
  // The server decides what each site allows; stub that answer here so the
  // test does not depend on the internet.
  await page.route("**/api/embeds", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        embeds: {
          "https://osint-neural-atlas.pages.dev/": true,
          "https://vantageintel.app/": false,
          "https://stream-overlay-builder.pages.dev/": false,
          "https://learnatbillioncodes.com/": false,
        },
      }),
    }),
  );
  await page.goto("/about");
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: /^Safari/ })
    .click();
  const tabs = page.getByRole("tablist", { name: "Projects" });
  await expect(tabs.getByRole("tab").first()).toHaveText("Favorites");
  // A framable project loads its own site in the tab, at its own address.
  await tabs.getByRole("tab", { name: "OSINT / Neural" }).click();
  await expect(
    page.locator("iframe[title='OSINT / Neural (live site)']"),
  ).toHaveAttribute("src", "https://osint-neural-atlas.pages.dev/");
  await expect(page.locator(".safari-address")).toContainText(
    "osint-neural-atlas.pages.dev",
  );
  // A site that refuses framing keeps its real link in the tab, not a frame.
  await tabs.getByRole("tab", { name: "Vantage Visual Intelligence" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator(".safari-address")).toContainText(
    "vantageintel.app",
  );
  await expect(
    page.getByRole("link", { name: /Open vantageintel\.app/ }),
  ).toHaveAttribute("href", "https://vantageintel.app/");
  // A GitHub-only project opens its repository, with the case study alongside.
  await tabs.getByRole("tab", { name: /Korpeatech/ }).click();
  await expect(
    page.getByRole("link", { name: /Open github\.com/ }),
  ).toHaveAttribute(
    "href",
    "https://github.com/Billioncodes001/korpeatech-showcase",
  );
  await expect(
    page.getByRole("button", { name: "Read the case study" }),
  ).toBeVisible();
  // Back and forward move between the tabs just visited.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator(".safari-address")).toContainText(
    "vantageintel.app",
  );
  await page.getByRole("button", { name: "Forward" }).click();
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

test("Messages chats: free-text questions, suggestions, actions and memory", async ({
  page,
}, info) => {
  await page.goto("/about");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: /^Messages/ })
    .click();
  const log = page.getByRole("log");
  await expect(log).toContainText("Hey 👋 I'm Josiah");
  const input = page.getByRole("textbox", { name: "Message Josiah" });
  // Typed questions get a real answer, not a canned one.
  await input.fill("Do you do anything besides code?");
  await input.press("Enter");
  await expect(log).toContainText("Zonal Coordinator");
  await expect(input).toHaveValue("");
  // Suggestions stay available after they have been used.
  const ask = page.getByRole("group", { name: "Suggestions" });
  await ask.getByRole("button", { name: "What's your stack?" }).click();
  await expect(log).toContainText("tools and counting");
  await expect(
    ask.getByRole("button", { name: "What's your stack?" }),
  ).toBeVisible();
  // Something the chat does not know gets an honest fallback.
  await input.fill("zzqx blorp");
  await input.press("Enter");
  await expect(log).toContainText("I didn't quite catch that");
  // A reply can open the window it talks about.
  await input.fill("show me your best work");
  await input.press("Enter");
  await expect(log.getByRole("button", { name: "Open Work" })).toBeVisible({
    timeout: 8000,
  });
  await log.getByRole("button", { name: "Open Work" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  // The secret is unlocked by asking for one, and the progress is kept.
  await page.goto("/about");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: /^Messages/ })
    .click();
  await page
    .getByRole("textbox", { name: "Message Josiah" })
    .fill("tell me a secret");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Secret found: Confidant/)).toBeVisible();
  // The conversation survives closing and reopening within the session.
  // A reload lands back on the home screen, so the dock is there on phones too.
  await page.reload();
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: /^Messages/ })
    .click();
  await expect(page.getByRole("log")).toContainText("Zonal Coordinator");
  await expect(page.getByRole("log")).toContainText("tools and counting");
});

test("Messages keeps the secrets hunt working from the Konami code", async ({
  page,
}, info) => {
  await page.goto("/about");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Dock" })
    .getByRole("button", { name: /^Messages/ })
    .click();
  // Progress survives a reload, and the Konami code is a second find.
  await page.reload();
  for (const key of [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a",
  ])
    await page.keyboard.press(key);
  await expect(page.getByText(/Secret found: Old-school/)).toBeVisible();
});

test("ja. pocket plays cartridges from the keyboard and pad", async ({
  page,
}, info) => {
  await page.goto("/pocket");
  const pocket = page.getByRole("application", { name: /ja\. pocket console/ });
  await expect(page.getByText("Insert a cartridge")).toBeVisible();
  // A click inserts a cartridge, and the cartridge lives in the URL.
  await page.getByRole("button", { name: /About me cartridge/ }).click();
  await expect(page).toHaveURL(/\/pocket\?c=about$/);
  await expect(page.getByText(/^1 of \d+$/)).toBeVisible();
  await pocket.press("x");
  await pocket.press("x");
  await expect(page.getByText(/^2 of \d+$/)).toBeVisible();
  // Number keys swap cartridges; menus open with A and close with B.
  await pocket.press("3");
  await expect(page).toHaveURL(/c=projects$/);
  await pocket.press("ArrowDown");
  await pocket.press("x");
  await expect(
    page.getByRole("button", { name: /Read the case study/ }),
  ).toBeVisible();
  await pocket.press("z");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  // On-screen buttons work as well as keys.
  await page.getByRole("button", { name: /Leadership cartridge/ }).click();
  await page.getByRole("button", { name: "A button, select" }).click();
  await expect(
    page.getByText("Zonal Coordinator — Southwest Zone D"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Eject cartridge" }).click();
  await expect(page).toHaveURL(/\/pocket$/);
  if (info.project.name === "mobile") return;
  await pocket.press("6");
  await expect(page.getByRole("img", { name: /Bug Squash/ })).toBeVisible();
});

test("In the News lists sourced coverage and statements", async ({ page }) => {
  await page.goto("/press");
  await expect(page.locator("h1")).toHaveText(/In the\s*news/);
  const cards = page.locator(".recognition-grid article");
  await expect(cards).not.toHaveCount(0);
  for (const link of await cards.getByRole("link").all())
    expect(await link.getAttribute("href")).toMatch(/^https:\/\//);
  await page.getByRole("button", { name: "Statements" }).click();
  await expect(cards.first()).toContainText("Read the statement");
  // Sections still waiting on evidence stay off the home screen.
  await expect(
    page
      .getByRole("list", { name: "Apps" })
      .getByRole("button", { name: "Kind words" }),
  ).toHaveCount(0);
});

test("a missing page is a secret too", async ({ page }) => {
  await page.goto("/nowhere-at-all");
  await expect(page.getByText("This page took a wrong turn.")).toBeVisible();
  await expect(page.getByText(/Secret found: Off the map/)).toBeVisible();
});
