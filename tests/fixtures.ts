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
