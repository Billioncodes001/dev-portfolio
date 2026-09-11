import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { loadPortfolio } from "../server/content";

const origin = "https://josiahadeyemo.me";
const admin = "local-test-only-admin-token-not-a-real-secret";
const config = {
  modules: true,
  scriptPath: resolve(".worker-build/index.js"),
  compatibilityDate: "2026-09-01",
  d1Databases: ["DB"],
  assets: {
    directory: resolve("dist"),
    binding: "ASSETS",
    run_worker_first: ["/api", "/api/*"],
    routerConfig: { has_user_worker: true },
    assetConfig: { not_found_handling: "none" as const },
  },
  bindings: {
    SITE_ORIGIN: origin,
    GITHUB_SYNC_ENABLED: "false",
    ADMIN_TOKEN: admin,
  },
};
const mf = new Miniflare(convertV4MiniflareOptions(config));
let db: Awaited<ReturnType<Miniflare["getD1Database"]>>;
const valid = {
  name: "Webinar test",
  email: "test@example.com",
  service: "Backend & APIs",
  message: "This is an isolated local test message, not a real lead.",
  website: "",
};

async function migrate(runtime: Miniflare) {
  const database = await runtime.getD1Database("DB");
  const migration = await readFile("migrations/0001_contact.sql", "utf8");
  for (const statement of migration
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean))
    await database.prepare(statement).run();
  return database;
}
before(async () => {
  db = await migrate(mf);
});
beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM messages"),
    db.prepare("DELETE FROM contact_rate_limits"),
  ]);
});
after(() => mf.dispose());
function submit(
  body: unknown = valid,
  key: string = randomUUID(),
  headers: Record<string, string> = {},
) {
  return mf.dispatchFetch(origin + "/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Idempotency-Key": key,
      "CF-Connecting-IP": "192.0.2.10",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test("Worker portfolio matches Express content including screenshots and release evidence", async () => {
  const response = await mf.dispatchFetch(origin + "/api/portfolio");
  assert.equal(response.status, 200);
  assert.deepEqual(
    await response.json(),
    await loadPortfolio(resolve("public")),
  );
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("real Worker routing distinguishes SPA deep links, missing files and API navigations", async () => {
  const base = await loadPortfolio(resolve("public"));
  const slug = base.projects[0].title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  for (const path of ["/", "/contact", "/projects", "/projects/" + slug]) {
    const response = await mf.dispatchFetch(origin + path, {
      headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
    });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("Content-Type") || "", /text\/html/);
    assert.match(await response.text(), /id="root"/);
  }
  const missing = await mf.dispatchFetch(origin + "/not-a-page", {
    headers: { Accept: "text/html" },
  });
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /id="root"/);
  for (const path of [
    "/api",
    "/api/unknown",
    "/api/contact",
    "/api/messages",
    "/api/inbox",
    "/data/messages.sqlite",
    "/images/missing.png",
    "/assets/missing.js",
    "/.env",
    "/.git/config",
  ]) {
    const response = await mf.dispatchFetch(origin + path, {
      headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
    });
    assert.equal(response.status, 404, path);
    assert.doesNotMatch(await response.text(), /id="root"/, path);
  }
  const head = await mf.dispatchFetch(origin + "/contact", {
    method: "HEAD",
    headers: { Accept: "text/html" },
  });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("contact is durably stored once and retry returns the same identifier", async () => {
  const key = randomUUID();
  const first = await submit(valid, key);
  assert.equal(first.status, 201);
  const result = await first.json();
  const second = await submit(valid, key.toUpperCase());
  assert.equal(second.status, 201);
  assert.deepEqual(await second.json(), result);
  const rows = await db.prepare("SELECT * FROM messages").all();
  assert.equal(rows.results.length, 1);
  assert.equal(rows.results[0].message, valid.message);
  assert.equal(rows.results[0].email, valid.email);
  assert.equal(
    (
      await submit(
        {
          ...valid,
          message: "A different message must not replace the saved message.",
        },
        key,
      )
    ).status,
    409,
  );
});

test("concurrent duplicate and conflicting requests cannot overwrite a contact", async () => {
  const key = randomUUID();
  const responses = await Promise.all(
    Array.from({ length: 5 }, () => submit(valid, key)),
  );
  const values = await Promise.all(
    responses.map((response) => response.json()),
  );
  assert.ok(responses.every((response) => response.status === 201));
  assert.ok(
    values.every(
      (value) => JSON.stringify(value) === JSON.stringify(values[0]),
    ),
  );
  assert.equal(
    await db.prepare("SELECT count(*) AS count FROM messages").first("count"),
    1,
  );
});

test("contact requires exact same origin and blocks cross-site requests and preflights", async () => {
  const rejectedOrigins: Record<string, string>[] = [
    { Origin: "" },
    { Origin: "null" },
    { Origin: "https://evil.example" },
    { Origin: origin + "/" },
    { Origin: origin + ".evil.example" },
    { "Sec-Fetch-Site": "cross-site" },
  ];
  for (const headers of rejectedOrigins)
    assert.equal((await submit(valid, randomUUID(), headers)).status, 403);
  const response = await mf.dispatchFetch(origin + "/api/contact", {
    method: "OPTIONS",
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(
    await db.prepare("SELECT count(*) AS count FROM messages").first("count"),
    0,
  );
});

test("input validation rejects bad fields, missing keys, malformed JSON and unsupported media", async () => {
  for (const body of [
    { ...valid, email: "not-an-email" },
    { ...valid, name: " " },
    { ...valid, service: "Injected service" },
    { ...valid, message: "x" },
    { ...valid, message: "x".repeat(5001) },
    null,
    [],
  ])
    assert.equal((await submit(body)).status, 400);
  assert.equal((await submit(valid, "not-a-uuid")).status, 400);
  assert.equal(
    (await submit(valid, randomUUID(), { "Content-Type": "text/plain" }))
      .status,
    415,
  );
  assert.equal(
    (await submit(valid, randomUUID(), { "Content-Encoding": "gzip" })).status,
    415,
  );
  const malformed = await mf.dispatchFetch(origin + "/api/contact", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: "{",
  });
  assert.equal(malformed.status, 400);
});

test("bounded body rejects oversized declared and streamed bodies", async () => {
  const big = await submit({ ...valid, message: "x".repeat(17000) });
  assert.equal(big.status, 413);
  const stream = Readable.from([
    Buffer.from('{"padding":"' + "x".repeat(9000)),
    Buffer.from("x".repeat(9000) + '"}'),
  ]);
  const response = await mf.dispatchFetch(origin + "/api/contact", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "Idempotency-Key": randomUUID(),
    },
    body: stream,
    duplex: "half",
  });
  assert.equal(response.status, 413);
  assert.equal(
    await db.prepare("SELECT count(*) AS count FROM messages").first("count"),
    0,
  );
});

test("honeypot submissions are accepted without storing contact data", async () => {
  assert.equal(
    (await submit({ ...valid, website: "https://spam.example" })).status,
    202,
  );
  assert.equal(
    await db.prepare("SELECT count(*) AS count FROM messages").first("count"),
    0,
  );
});

test("D1 rate limit is atomic, persists across requests and ignores forged forwarding headers", async () => {
  const keys = Array.from({ length: 12 }, () => randomUUID());
  const responses = await Promise.all(
    keys.map((key, i) =>
      submit(valid, key, { "X-Forwarded-For": "192.0.2." + i }),
    ),
  );
  assert.equal(
    responses.filter((response) => response.status === 201).length,
    5,
  );
  const rejected = responses.filter((response) => response.status === 429);
  assert.equal(rejected.length, 7);
  assert.ok(Number(rejected[0].headers.get("Retry-After")) > 0);
  assert.equal(
    await db.prepare("SELECT count(*) AS count FROM messages").first("count"),
    5,
  );
  const existingKey =
    keys[responses.findIndex((response) => response.status === 201)];
  assert.equal(
    (await submit(valid, existingKey)).status,
    201,
    "legitimate retries survive an exhausted quota",
  );
  assert.equal(
    (await submit(valid, randomUUID(), { "CF-Connecting-IP": "192.0.2.200" }))
      .status,
    201,
  );
  const buckets = await db.prepare("SELECT key FROM contact_rate_limits").all();
  assert.ok(
    buckets.results.every((row) => /^[a-f0-9]{64}$/.test(String(row.key))),
  );
});

test("private review requires bearer auth, bounds output and never exposes internal keys", async () => {
  await submit();
  for (const path of [
    "/api/admin/messages",
    "/api/admin/messages?token=" + admin,
  ]) {
    const response = await mf.dispatchFetch(origin + path);
    assert.equal(response.status, 401);
    assert.doesNotMatch(await response.text(), /test@example.com/);
  }
  const headers = { Authorization: "Bearer " + admin };
  const response = await mf.dispatchFetch(
    origin + "/api/admin/messages?limit=1",
    { headers },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const text = await response.text();
  assert.match(text, /test@example.com/);
  assert.doesNotMatch(text, /request_key|payload_hash/);
  assert.equal(
    (
      await mf.dispatchFetch(origin + "/api/admin/messages?limit=999", {
        headers,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await mf.dispatchFetch(origin + "/api/admin/messages", {
        headers: { ...headers, Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
});

test("missing admin secret disables review and missing migrations fail closed", async () => {
  const cold = new Miniflare(
    convertV4MiniflareOptions({
      ...config,
      bindings: { SITE_ORIGIN: origin, GITHUB_SYNC_ENABLED: "false" },
    }),
  );
  try {
    assert.equal(
      (
        await cold.dispatchFetch(origin + "/api/admin/messages", {
          headers: { Authorization: "Bearer " + admin },
        })
      ).status,
      404,
    );
    const health = await cold.dispatchFetch(origin + "/api/health");
    assert.equal(health.status, 503);
    assert.deepEqual(await health.json(), { status: "unavailable" });
    const response = await cold.dispatchFetch(origin + "/api/contact", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(valid),
    });
    assert.equal(response.status, 503);
    assert.doesNotMatch(
      await response.text(),
      /SQL|D1|SELECT|INSERT|test@example.com/,
    );
    await migrate(cold);
    assert.equal(
      (await cold.dispatchFetch(origin + "/api/health")).status,
      200,
    );
  } finally {
    await cold.dispose();
  }
});

test("Worker GitHub discovery persists a public snapshot and warm polls avoid upstream work", async (t) => {
  let requests = 0;
  const live = new Miniflare(
    convertV4MiniflareOptions({
      ...config,
      bindings: {
        SITE_ORIGIN: origin,
        GITHUB_USERNAME: "billioncodes001",
        GITHUB_SYNC_ENABLED: "true",
      },
      outboundService: async () => {
        requests++;
        return Response.json([
          {
            id: 9911,
            name: "webinar-fixture",
            full_name: "billioncodes001/webinar-fixture",
            owner: { login: "billioncodes001" },
            html_url: "https://github.com/billioncodes001/webinar-fixture",
            description: "Isolated test repository",
            homepage: null,
            language: "TypeScript",
            topics: [],
            private: false,
            fork: false,
            archived: false,
            disabled: false,
            size: 1,
            stargazers_count: 0,
            pushed_at: "2026-09-11T10:00:00Z",
            created_at: "2026-09-11T10:00:00Z",
          },
        ]);
      },
    }),
  );
  try {
    const database = await migrate(live);
    const first = await live.dispatchFetch(origin + "/api/portfolio");
    assert.equal(first.status, 200);
    const body = await first.text();
    assert.equal(JSON.parse(body).projects.at(-1).slug, "github-9911");
    assert.equal(requests, 1);
    const stored = await database
      .prepare(
        "SELECT snapshot FROM github_cache WHERE username = 'billioncodes001'",
      )
      .first<string>("snapshot");
    assert.ok(stored?.includes("webinar-fixture"));
    const start = performance.now();
    for (let i = 0; i < 25; i++)
      assert.equal(
        await (await live.dispatchFetch(origin + "/api/portfolio")).text(),
        body,
      );
    t.diagnostic(
      `25 warm local polls: ${Math.round(performance.now() - start)} ms total wall time; ${body.length} characters; this is not production CPU time.`,
    );
    assert.equal(
      requests,
      1,
      "warm polls reuse serialized public content without another GitHub fetch",
    );
    const deep = await live.dispatchFetch(origin + "/projects/github-9911", {
      headers: { Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
    });
    assert.equal(deep.status, 200);
  } finally {
    await live.dispose();
  }
});
