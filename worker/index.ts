import { z } from "zod";
import { contactSchema, type Portfolio } from "../shared/schema";
import { createGitHubFeed } from "../shared/github";
import { pageTitles, projectSlug } from "../shared/paths";
import { checkEmbeds, embedCandidates } from "../shared/embeds";
import { portfolio, previews, releases } from "./content";
import { accepted, findMessage, rateLimit, saveMessage } from "./store";
import {
  boundedJson,
  digest,
  HttpError,
  json,
  sameOrigin,
  securityHeaders,
} from "./security";

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SITE_ORIGIN: string;
  GITHUB_USERNAME?: string;
  GITHUB_SYNC_ENABLED?: string;
  GITHUB_TOKEN?: string;
  ADMIN_TOKEN?: string;
}

let feed: ReturnType<typeof createGitHubFeed> | undefined;
let feedKey = "";
type Snapshot = { data: Portfolio; body: string; expires: number };
const FIRST_LOAD_MS = 8000;
let snapshot: Snapshot | undefined;
let loading: Promise<Snapshot> | undefined;
const built = (data: Portfolio, expires: number): Snapshot => ({
  data,
  body: JSON.stringify(data),
  expires,
});
async function getSnapshot(env: Env) {
  const username = env.GITHUB_USERNAME || "billioncodes001";
  const key =
    username + ":" + env.GITHUB_SYNC_ENABLED + ":" + (env.GITHUB_TOKEN || "");
  if (!feed || feedKey !== key) {
    feedKey = key;
    snapshot = undefined;
    loading = undefined;
    feed = createGitHubFeed({
      username,
      previews,
      releases,
      token: env.GITHUB_TOKEN,
      enabled: env.GITHUB_SYNC_ENABLED !== "false",
      maxRequests: 40,
      cache: {
        async load() {
          const value = await env.DB.prepare(
            "SELECT snapshot FROM github_cache WHERE username = ?",
          )
            .bind(username.toLowerCase())
            .first<string>("snapshot");
          if (!value) throw new Error("Empty cache");
          return value;
        },
        async save(value) {
          await env.DB.prepare(
            `INSERT INTO github_cache VALUES (?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at`,
          )
            .bind(username.toLowerCase(), value, Date.now())
            .run();
        },
      },
    });
  }
  if (snapshot && snapshot.expires > Date.now()) return snapshot;
  // One GitHub refresh at a time. Its result is cached, and a failure keeps
  // the last good snapshot.
  if (!loading)
    loading = feed
      .getPortfolio(portfolio)
      .then((data) => {
        snapshot = built(data, Date.now() + 60_000);
        return snapshot;
      })
      .finally(() => {
        loading = undefined;
      });
  // With something cached, answer at once and let the refresh finish behind
  // it. GitHub can take a long time, and visitors should never wait on it.
  if (snapshot) {
    loading.catch(() => undefined);
    return snapshot;
  }
  // First request after a cold start: wait briefly for live data, otherwise
  // serve the built-in portfolio so the page still renders.
  const fallback = new Promise<Snapshot>((resolve) =>
    setTimeout(
      () => resolve(built(portfolio, Date.now() + 15_000)),
      FIRST_LOAD_MS,
    ),
  );
  return Promise.race([
    loading.catch(() => built(portfolio, Date.now() + 15_000)),
    fallback,
  ]);
}

async function contact(request: Request, env: Env) {
  sameOrigin(request, env.SITE_ORIGIN);
  const key = z.uuid().safeParse(request.headers.get("Idempotency-Key"));
  if (!key.success)
    throw new HttpError(400, "A valid request identifier is required.");
  const input = contactSchema.safeParse(await boundedJson(request));
  if (!input.success)
    return json(
      {
        error: "Please check your message.",
        fields: z.flattenError(input.error).fieldErrors,
      },
      400,
    );
  const hash = await digest(JSON.stringify(input.data));
  const existing = await findMessage(env.DB, key.data.toLowerCase());
  if (existing) return json(accepted(existing, hash), 201);
  const limit = await rateLimit(env.DB, request);
  if (!limit.allowed)
    return json(
      {
        error:
          "Too many messages. Please try again in 15 minutes or use email.",
      },
      429,
      { "Retry-After": String(limit.retryAfter) },
    );
  if (input.data.website) return json({ accepted: true }, 202);
  return json(
    await saveMessage(env.DB, input.data, key.data.toLowerCase(), hash),
    201,
  );
}

async function review(request: Request, env: Env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 32)
    throw new HttpError(404, "Endpoint not found.");
  const supplied =
    request.headers
      .get("Authorization")
      ?.match(/^Bearer ([\x21-\x7e]{1,256})$/)?.[1] || "";
  const actual = await digest(supplied);
  const expected = await digest(env.ADMIN_TOKEN);
  if (
    !crypto.subtle.timingSafeEqual(
      new TextEncoder().encode(actual),
      new TextEncoder().encode(expected),
    )
  )
    return json({ error: "Authentication required." }, 401, {
      "WWW-Authenticate": "Bearer",
    });
  const origin = request.headers.get("Origin");
  if (
    (origin && origin !== env.SITE_ORIGIN) ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  )
    throw new HttpError(403, "This origin is not allowed.");
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 25);
  const offset = Number(url.searchParams.get("offset") || 0);
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 10000
  )
    throw new HttpError(400, "Invalid pagination.");
  const rows = await env.DB.prepare(
    `SELECT id, name, email, service, message, created_at
    FROM messages ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all();
  return json({ messages: rows.results, limit, offset }, 200, {
    "X-Robots-Tag": "noindex, nofollow",
    Vary: "Authorization",
  });
}

async function handle(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/api" || path.startsWith("/api/")) {
    if (request.method === "GET" && path === "/api/health") {
      try {
        // Checks migrations and contact readiness, not just database connectivity.
        await env.DB.batch([
          env.DB.prepare("SELECT id FROM messages LIMIT 1"),
          env.DB.prepare("SELECT key FROM contact_rate_limits LIMIT 1"),
          env.DB.prepare("SELECT username FROM github_cache LIMIT 1"),
        ]);
        const salt = await env.DB.prepare(
          "SELECT value FROM runtime_config WHERE key = 'rate_salt'",
        ).first();
        if (!salt) throw new Error("Missing rate salt");
        return json({ status: "ok" });
      } catch {
        return json({ status: "unavailable" }, 503);
      }
    }
    if (request.method === "GET" && path === "/api/portfolio")
      return new Response((await getSnapshot(env)).body, {
        headers: {
          ...securityHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    if (request.method === "GET" && path === "/api/embeds") {
      const { data } = await getSnapshot(env);
      const urls = embedCandidates(data.projects, url.hostname);
      return json({ embeds: await checkEmbeds(urls, url.origin) });
    }
    if (request.method === "POST" && path === "/api/contact")
      return contact(request, env);
    if (request.method === "GET" && path === "/api/admin/messages")
      return review(request, env);
    return json({ error: "Endpoint not found." }, 404);
  }
  if (!["GET", "HEAD"].includes(request.method))
    return json({ error: "Method not allowed." }, 405);
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) return asset;
  // Missing files never return index.html; real deep links get the SPA and unknown pages remain 404.
  if (
    path.includes(".") ||
    !(request.headers.get("Accept") || "").includes("text/html")
  )
    return new Response("Not found", { status: 404, headers: securityHeaders });
  const normalized = path.replace(/\/$/, "") || "/";
  let known =
    Object.hasOwn(pageTitles, normalized) ||
    portfolio.projects.some(
      (project) => normalized === "/projects/" + projectSlug(project),
    );
  if (!known && /^\/projects\/github-\d+$/.test(normalized))
    known = (await getSnapshot(env)).data.projects.some(
      (project) => normalized === "/projects/" + projectSlug(project),
    );
  const shell = await env.ASSETS.fetch(
    new Request(new URL("/index.html", url), { method: "GET" }),
  );
  if (!shell.ok) return json({ error: "Site assets unavailable." }, 503);
  return new Response(request.method === "HEAD" ? null : shell.body, {
    status: known ? 200 : 404,
    headers: {
      ...securityHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handle(request, env);
    } catch (error) {
      // Do not log contact bodies, bearer credentials or D1 query errors.
      return json(
        {
          error:
            error instanceof HttpError
              ? error.message
              : "Service unavailable. Please try again.",
        },
        error instanceof HttpError ? error.status : 503,
      );
    }
  },
} satisfies ExportedHandler<Env>;
