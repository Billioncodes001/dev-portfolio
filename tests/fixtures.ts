import { test as base, expect, type Page } from "@playwright/test";

/**
 * Content specs start on the desktop, as a returning visitor would. The boot
 * and lock screens have their own coverage in os.spec.ts.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("ja-os-booted", "1");
      } catch {
        /* Opaque origins have no storage; the boot simply runs. */
      }
    });
    await provide(page);
  },
});

/** The window in front: where the page for the current URL is rendered. */
export const front = (page: Page) => page.locator(".os-window.is-active");

export { expect };

/**
 * Phones open on the home screen, not on Welcome. This opens the Welcome page
 * from there, and does nothing on the desktop, where Welcome opens by itself.
 */
export async function openWelcome(page: Page, project: string) {
  if (project !== "mobile") return;
  await page
    .getByRole("list", { name: "Apps" })
    .getByRole("button", { name: "Welcome", exact: true })
    .click();
}

/** Whatever a page opens on: its heading, or the phone home screen. */
export const landed = (page: Page) =>
  page
    .getByRole("heading", { level: 1 })
    .or(page.getByRole("list", { name: "Apps" }))
    .first();
