import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import type { AddressInfo } from "node:net";
import { loadPortfolio } from "./content";
import { createApp } from "./app";
import { createStore } from "./store";

test("new repository detail routes become valid without restarting production", async (t) => {
  const base = await loadPortfolio(resolve("public"));
  const directory = await mkdtemp(join(tmpdir(), "github-routing-"));
  await writeFile(
    join(directory, "index.html"),
    "<!doctype html><html><body>Portfolio</body></html>",
  );
  let current = base;
  const store = createStore(":memory:");
  const server = createApp({
    portfolio: base,
    getPortfolio: () => Promise.resolve(current),
    store,
    origins: [],
    distDir: directory,
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
    store.close();
    await rm(directory, { recursive: true, force: true });
  });
  const url = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
  assert.equal((await fetch(url + "/projects/github-999")).status, 404);
  current = {
    ...base,
    projects: [
      ...base.projects,
      {
        title: "Discovered repo",
        slug: "github-999",
        source: "github",
        bodyText: "New public work.",
        tags: [],
        links: [],
      },
    ],
  };
  assert.equal((await fetch(url + "/projects/github-999")).status, 200);
  assert.equal(
    (await (await fetch(url + "/api/portfolio")).json()).projects.length,
    14,
  );
});
