import { defineConfig, devices } from "@playwright/test";

const worker = process.env.PORTFOLIO_RUNTIME === "worker";
const baseURL = worker ? "http://127.0.0.1:4174" : "http://127.0.0.1:4173";
const workerState = ".wrangler/e2e-" + process.pid;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  webServer: {
    command: worker
      ? `npm run worker:migrate:local -- --persist-to ${workerState} && npm run dev:worker -- --persist-to ${workerState} --var GITHUB_SYNC_ENABLED:false`
      : "npm start",
    env: {
      PORT: "4173",
      HOST: "127.0.0.1",
      SITE_ORIGIN: "http://127.0.0.1:4173",
      DATA_DIR: "./test-results/inbox",
      GITHUB_SYNC_ENABLED: "false",
    },
    url: baseURL + "/api/health",
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
