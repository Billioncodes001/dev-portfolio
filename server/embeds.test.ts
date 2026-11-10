import test from "node:test";
import assert from "node:assert/strict";
import {
  FRAME_SOURCES,
  checkEmbeds,
  clearEmbedCache,
  embedCandidates,
  frameVerdict,
} from "../shared/embeds";

const origin = "https://josiahadeyemo.me";
const headers = (entries: Record<string, string>) => new Headers(entries);

test("a page with no framing rules can be shown in a tab", () => {
  assert.equal(frameVerdict(headers({}), origin), true);
  assert.equal(
    frameVerdict(headers({ "content-security-policy": "default-src 'self'" }), origin),
    true,
  );
});

test("X-Frame-Options DENY and SAMEORIGIN block framing", () => {
  assert.equal(frameVerdict(headers({ "x-frame-options": "DENY" }), origin), false);
  assert.equal(frameVerdict(headers({ "x-frame-options": "sameorigin" }), origin), false);
  assert.equal(
    frameVerdict(headers({ "x-frame-options": "ALLOW-FROM https://josiahadeyemo.me" }), origin),
    false,
  );
});

test("frame-ancestors decides by listing our origin, a wildcard, or https:", () => {
  const ancestors = (value: string) =>
    headers({ "content-security-policy": "default-src 'self'; " + value });
  assert.equal(frameVerdict(ancestors("frame-ancestors 'none'"), origin), false);
  assert.equal(frameVerdict(ancestors("frame-ancestors 'self'"), origin), false);
  assert.equal(
    frameVerdict(ancestors("frame-ancestors https://josiahadeyemo.me"), origin),
    true,
  );
  assert.equal(frameVerdict(ancestors("frame-ancestors *"), origin), true);
  assert.equal(frameVerdict(ancestors("frame-ancestors https:"), origin), true);
  assert.equal(
    frameVerdict(ancestors("frame-ancestors https://other.example"), origin),
    false,
  );
});

test("candidates skip GitHub, our own host and non-https links, and keep order", () => {
  const urls = embedCandidates(
    [
      {
        links: [
          { href: "https://github.com/Billioncodes001/x" },
          { href: "https://vantageintel.app/" },
          { href: "http://insecure.example/" },
        ],
      },
      { links: [{ href: "https://josiahadeyemo.me" }] },
      { links: [{ href: "https://vantageintel.app/" }, { href: "not a url" }] },
    ],
    "josiahadeyemo.me",
  );
  assert.deepEqual(urls, ["https://vantageintel.app/"]);
});

test("every live project origin is allowed by the frame policy", async () => {
  const { readFile } = await import("node:fs/promises");
  const headers = await readFile("public/_headers", "utf8");
  for (const source of FRAME_SOURCES) assert.match(headers, new RegExp(source.replace(/\./g, "\\.")));
});

test("checkEmbeds reads each site once and caches the answer", async () => {
  clearEmbedCache();
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(String(url));
    return new Response("", {
      headers: url.includes("blocked") ? { "x-frame-options": "DENY" } : {},
    });
  }) as typeof fetch;
  const urls = ["https://blocked.example/", "https://open.example/"];
  const first = await checkEmbeds(urls, origin, fetcher, 1_000);
  assert.deepEqual(first, { "https://blocked.example/": false, "https://open.example/": true });
  const again = await checkEmbeds(urls, origin, fetcher, 2_000);
  assert.deepEqual(again, first);
  assert.equal(calls.length, 2, "second check is served from cache");
  clearEmbedCache();
});

test("an unreachable site counts as blocked and is retried sooner", async () => {
  clearEmbedCache();
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    throw new TypeError("network down");
  }) as typeof fetch;
  const url = "https://offline.example/";
  assert.deepEqual(await checkEmbeds([url], origin, fetcher, 0), { [url]: false });
  await checkEmbeds([url], origin, fetcher, 5 * 60 * 1000);
  assert.equal(calls, 1, "still cached inside the retry window");
  await checkEmbeds([url], origin, fetcher, 11 * 60 * 1000);
  assert.equal(calls, 2, "retried after ten minutes");
  clearEmbedCache();
});
