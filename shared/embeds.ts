/**
 * Safari tabs show a project's own site inside the window when the site allows
 * it. A site decides that with X-Frame-Options or CSP frame-ancestors; we read
 * those headers ourselves so the tab can say "this one opens in its own tab"
 * before it ever tries to load.
 *
 * FRAME_SOURCES is the list of origins our CSP lets the page frame. Keep it in
 * sync with public/_headers (static index) and the server and Worker headers,
 * which read it from here. tests/os.spec.ts checks every project link is on it.
 */
export const FRAME_SOURCES = [
  "https://osint-neural-atlas.pages.dev",
  "https://vantageintel.app",
  "https://stream-overlay-builder.pages.dev",
  "https://learnatbillioncodes.com",
];

/** Hosts whose pages never allow framing, so no check is needed. */
const NEVER_FRAMED = new Set(["github.com", "www.github.com"]);

/** True when a browser would show `headers`' page inside a frame on `origin`. */
export function frameVerdict(headers: Headers, origin: string): boolean {
  const xfo = headers.get("x-frame-options")?.trim().toUpperCase();
  if (xfo === "DENY" || xfo === "SAMEORIGIN") return false;
  if (xfo?.startsWith("ALLOW-FROM")) return false;
  const policy = headers.get("content-security-policy") ?? "";
  const ancestors = policy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => /^frame-ancestors\b/i.test(directive));
  if (!ancestors) return true;
  const sources = ancestors.split(/\s+/).slice(1);
  return (
    sources.includes("*") ||
    sources.includes("https:") ||
    sources.includes(origin)
  );
}

/**
 * The project links worth checking: real websites other than GitHub and our
 * own site. Order follows the portfolio, so the first one is each tab's link.
 */
export function embedCandidates(
  projects: { links: { href: string }[] }[],
  ownHost: string,
): string[] {
  const urls = new Set<string>();
  for (const project of projects)
    for (const link of project.links) {
      let url: URL;
      try {
        url = new URL(link.href);
      } catch {
        continue;
      }
      if (url.protocol !== "https:") continue;
      if (NEVER_FRAMED.has(url.hostname) || url.hostname === ownHost) continue;
      urls.add(url.href);
    }
  return [...urls];
}

type Entry = { ok: boolean; until: number };
const cache = new Map<string, Entry>();
const LIVE_MS = 6 * 60 * 60 * 1000;
const FAILED_MS = 10 * 60 * 1000;

/**
 * Checks each URL's headers (cached: six hours when it answers, ten minutes
 * when it doesn't). `origin` is our own origin, which frame-ancestors must list.
 */
export async function checkEmbeds(
  urls: string[],
  origin: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  await Promise.all(
    urls.map(async (url) => {
      const hit = cache.get(url);
      if (hit && hit.until > now) {
        result[url] = hit.ok;
        return;
      }
      let entry: Entry = { ok: false, until: now + FAILED_MS };
      try {
        const response = await fetcher(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(5000),
          headers: { "User-Agent": "josiahadeyemo.me embed check" },
        });
        entry = {
          ok: frameVerdict(response.headers, origin),
          until: now + LIVE_MS,
        };
        await response.body?.cancel();
      } catch {
        // Unreachable sites are retried sooner than answering ones.
      }
      cache.set(url, entry);
      result[url] = entry.ok;
    }),
  );
  return result;
}

/** Test helper: forget cached verdicts. */
export function clearEmbedCache() {
  cache.clear();
}
