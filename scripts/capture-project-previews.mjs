// Read-only captures of public landing pages in fresh, unauthenticated contexts.
// Run deliberately, not during CI: external availability should not gate builds.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const targets = [
  ["osint-neural", "https://osint-neural-atlas.pages.dev/"],
  ["vantage", "https://vantageintel.app/"],
  ["overlay-studio", "https://stream-overlay-builder.pages.dev/"],
  [
    "tunji-ojo",
    process.env.TUNJI_PREVIEW_URL ||
      "https://billioncodes001.github.io/tunji-ojo/",
  ],
];
const directory = resolve("public/images/projects");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL,
});
try {
  for (const [name, url] of targets) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      if (!response?.ok())
        throw new Error(`${name}: HTTP ${response?.status()}`);
      await page.evaluate(() =>
        Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ]),
      );
      await page.waitForTimeout(5000);
      await sharp(
        await page.screenshot({ animations: "disabled", timeout: 15000 }),
      )
        .webp({ quality: 84 })
        .toFile(resolve(directory, `${name}.webp`));
      console.log(`${name}: captured ${page.url()}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
