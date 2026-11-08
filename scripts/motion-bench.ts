/**
 * Motion benchmark: drives the desktop's main interactions in Chrome with a
 * 4× CPU slowdown and reports frame pacing plus time spent in layout, style
 * and script for each one.
 * Usage: bun scripts/motion-bench.ts [baseURL]
 */
import { chromium, type Page } from "@playwright/test";

const base = process.argv[2] ?? "http://127.0.0.1:4190";

type Result = {
  name: string;
  frames: number;
  p95: number;
  janky: number;
  layoutMs: number;
  styleMs: number;
  scriptMs: number;
};

async function measure(page: Page, name: string, run: () => Promise<void>) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const metric = async () => {
    const { metrics } = await cdp.send("Performance.getMetrics");
    const get = (n: string) => metrics.find((m) => m.name === n)?.value ?? 0;
    return {
      layouts: get("LayoutDuration") * 1000,
      styles: get("RecalcStyleDuration") * 1000,
      script: get("ScriptDuration") * 1000,
    };
  };
  await page.evaluate(() => {
    const w = window as unknown as { __f: number[]; __on: boolean };
    w.__f = [];
    w.__on = true;
    let last = performance.now();
    const tick = (now: number) => {
      w.__f.push(now - last);
      last = now;
      if (w.__on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const before = await metric();
  await run();
  await page.waitForTimeout(400);
  const after = await metric();
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __f: number[]; __on: boolean };
    w.__on = false;
    return w.__f.slice(1);
  });
  const sorted = [...frames].sort((a, b) => a - b);
  return {
    name,
    frames: frames.length,
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    janky: frames.filter((f) => f > 25).length,
    layoutMs: Math.round(after.layouts - before.layouts),
    styleMs: Math.round(after.styles - before.styles),
    scriptMs: Math.round(after.script - before.script),
  } satisfies Result;
}

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => sessionStorage.setItem("ja-os-booted", "1"));
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(base + "/about");
await page.waitForSelector(".os-window.is-active");
await page.waitForTimeout(1500);

const results: Result[] = [];
const bar = page.locator(".os-window.is-active .os-titlebar h2");
const box = (await bar.boundingBox())!;
results.push(
  await measure(page, "drag window", async () => {
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.down();
    for (let i = 1; i <= 60; i++)
      await page.mouse.move(box.x + 5 + i * 5, box.y + 5 + i * 2);
    await page.mouse.up();
  }),
);
results.push(
  await measure(page, "dock sweep", async () => {
    const dock = (await page.locator(".os-dock").boundingBox())!;
    for (let i = 0; i <= 60; i++)
      await page.mouse.move(dock.x + (dock.width * i) / 60, dock.y + dock.height / 2);
    await page.mouse.move(dock.x, dock.y - 200);
  }),
);
results.push(
  await measure(page, "maximise + restore", async () => {
    await page.getByRole("button", { name: "Maximise About" }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Restore About" }).click();
    await page.waitForTimeout(500);
  }),
);
results.push(
  await measure(page, "minimise + reopen", async () => {
    await page.getByRole("button", { name: "Minimise About" }).click();
    await page.waitForTimeout(500);
    await page
      .getByRole("list", { name: "Apps" })
      .getByRole("button", { name: "About", exact: true })
      .click();
    await page.waitForTimeout(500);
  }),
);
results.push(
  await measure(page, "open new window", async () => {
    await page
      .getByRole("navigation", { name: "Dock" })
      .getByRole("button", { name: /^Notes/ })
      .click();
    await page.waitForTimeout(700);
  }),
);
results.push(
  await measure(page, "wallpaper parallax", async () => {
    for (let i = 0; i <= 60; i++) await page.mouse.move(200 + i * 15, 300 + (i % 10) * 20);
  }),
);
results.push(
  await measure(page, "scroll page", async () => {
    await page.mouse.move(600, 500);
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 120);
  }),
);

// The lock screen, from a fresh session.
const lock = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await lock.goto(base + "/");
await lock.waitForSelector(".os-lock", { timeout: 15000 });
await lock.waitForTimeout(3500);
const lcdp = await lock.context().newCDPSession(lock);
await lcdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
results.push(
  await measure(lock, "swipe to unlock", async () => {
    await lock.mouse.move(720, 820);
    await lock.mouse.down();
    for (let i = 1; i <= 30; i++) await lock.mouse.move(720, 820 - i * 8);
    await lock.mouse.up();
    await lock.waitForTimeout(800);
  }),
);

console.table(results);
await browser.close();
