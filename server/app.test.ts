import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import type { AddressInfo } from "node:net";
import { createApp } from "./app";
import { loadPortfolio } from "./content";
import { createStore } from "./store";
import {
  portfolioSchema,
  type ContactInput,
  type Portfolio,
} from "../shared/schema";

const valid: ContactInput = {
  name: "Portfolio test",
  email: "portfolio-test@example.com",
  service: "Web development",
  message: "A local automated test of the portfolio contact endpoint.",
  website: "",
};

async function fixture(
  t: TestContext,
  rateLimitMax = 30,
  distDir?: string,
  getPortfolio?: () => Promise<Portfolio>,
) {
  const store = createStore(":memory:");
  const portfolio = await loadPortfolio(resolve("public"));
  const server = createApp({
    store,
    portfolio,
    origins: ["http://localhost:5173"],
    rateLimitMax,
    distDir,
    getPortfolio,
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
    store.close();
  });
  const base = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  const send = (body: unknown = valid, headers: Record<string, string> = {}) =>
    fetch(base + "/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
        Origin: "http://localhost:5173",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  return { base, store, send };
}

test("profile content validates and the API returns all original projects", async (t) => {
  const { base } = await fixture(t);
  const response = await fetch(base + "/api/portfolio");
  assert.equal(response.status, 200);
  const data = portfolioSchema.parse(await response.json());
  assert.equal(data.home.name, "Josiah Adeyemo");
  assert.equal(data.projects.length, 13);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("contact persists only validated data and deduplicates retries", async (t) => {
  const { send, store } = await fixture(t);
  const key = randomUUID();
  const first = await send(valid, { "Idempotency-Key": key });
  assert.equal(first.status, 201);
  const body = await first.json();
  const retry = await send(valid, { "Idempotency-Key": key });
  assert.equal(retry.status, 201);
  assert.equal((await retry.json()).id, body.id);
  assert.equal(store.list().length, 1);
  const conflict = await send(
    {
      ...valid,
      message: "An entirely different message reusing the same identifier.",
    },
    { "Idempotency-Key": key },
  );
  assert.equal(conflict.status, 409);
  assert.equal(store.list().length, 1);
});

test("invalid fields and missing identifiers never create a message", async (t) => {
  const { send, store } = await fixture(t);
  const invalid = await send({ ...valid, email: "broken", message: "short" });
  assert.equal(invalid.status, 400);
  assert.ok((await invalid.json()).fields.email);
  assert.equal((await send(valid, { "Idempotency-Key": "" })).status, 400);
  assert.equal(store.list().length, 0);
});

test("cross-origin requests, spam traps, and oversized payloads are handled", async (t) => {
  const { send, store, base } = await fixture(t);
  assert.equal(
    (await send(valid, { Origin: "https://other.example" })).status,
    403,
  );
  assert.equal(
    (await send(valid, { "Sec-Fetch-Site": "cross-site" })).status,
    403,
  );
  assert.equal(
    (await send({ ...valid, website: "https://spam.example" })).status,
    202,
  );
  assert.equal(
    (await send({ ...valid, message: "x".repeat(20000) })).status,
    413,
  );
  const malformed = await fetch(base + "/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, "Invalid JSON.");
  assert.equal(
    (await fetch(base + "/api/contact", { method: "POST", body: "bad" }))
      .status,
    415,
  );
  assert.equal(store.list().length, 0);
});

test("rate limits are enforced with retry information", async (t) => {
  const { send, store } = await fixture(t, 2);
  await send();
  await send();
  const blocked = await send();
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get("retry-after"));
  assert.equal(store.list().length, 2);
});

test("private messages have no public read endpoint and unknown API routes return JSON", async (t) => {
  const { base } = await fixture(t);
  for (const path of ["/api/messages", "/api/contact", "/api/missing"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type") || "", /json/);
  }
  assert.equal((await (await fetch(base + "/api/health")).json()).status, "ok");
});

test("messages survive closing and reopening the database", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-store-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filename = join(directory, "messages.sqlite");
  const first = createStore(filename);
  const input = {
    ...valid,
    name: "O'Brien",
    message: "This message includes 'quotes' and <script>text</script>.",
  };
  first.save(input, randomUUID());
  first.close();
  const reopened = createStore(filename);
  assert.equal(reopened.list().length, 1);
  assert.equal(reopened.list()[0].message, input.message);
  reopened.close();
});

test("production deep links serve the app with accurate not-found status codes", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-static-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, "index.html"),
    "<!doctype html><html><body>Portfolio</body></html>",
  );
  const { base } = await fixture(t, 30, directory);
  for (const path of [
    "/",
    "/about",
    "/contact",
    "/projects/korpeatech-tech-solutions",
  ]) {
    const response = await fetch(base + path, {
      headers: { Accept: "text/html" },
    });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("cache-control"), "no-cache");
    assert.match(await response.text(), /Portfolio/);
  }
  const missing = await fetch(base + "/not-a-page", {
    headers: { Accept: "text/html" },
  });
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /Portfolio/);
  const image = await fetch(base + "/images/missing.png");
  assert.equal(image.status, 404);
  assert.doesNotMatch(await image.text(), /Portfolio/);
});
