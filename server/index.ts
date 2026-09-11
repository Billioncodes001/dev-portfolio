import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { loadPortfolio, loadRepositoryPreviews, loadReleases } from "./content";
import { createStore } from "./store";
import { createGitHubFeed } from "./github";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolve(root, process.env.DATA_DIR || "data");
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const store = createStore(resolve(dataDir, "messages.sqlite"));
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535");
const host = process.env.HOST || "127.0.0.1";
const origins = process.env.SITE_ORIGIN
  ? [new URL(process.env.SITE_ORIGIN).origin]
  : [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:" + port,
      "http://127.0.0.1:" + port,
    ];
const portfolio = await loadPortfolio(resolve(root, "public"));
const github = createGitHubFeed({
  username: process.env.GITHUB_USERNAME || "billioncodes001",
  previews: await loadRepositoryPreviews(resolve(root, "public")),
  releases: await loadReleases(resolve(root, "public")),
  cacheFile: resolve(dataDir, "github-cache.json"),
  token: process.env.GITHUB_TOKEN,
  enabled: process.env.GITHUB_SYNC_ENABLED !== "false",
});
const app = createApp({
  portfolio,
  getPortfolio: () => github.getPortfolio(portfolio),
  store,
  origins,
  distDir: resolve(root, "dist"),
  trustProxy: process.env.TRUST_PROXY,
});
const server = app.listen(port, host, () =>
  console.log("Portfolio server: http://" + host + ":" + port),
);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    server.close(() => {
      store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
