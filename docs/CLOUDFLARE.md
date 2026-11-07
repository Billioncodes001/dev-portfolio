# Cloudflare launch handoff

Canonical site: **https://josiahadeyemo.me**. Worker: `josiah-portfolio`.
Account: `40687c1a299192a1ba3add80961e429f`. D1 database: `josiah-portfolio-db`, binding `DB`.
The parent reports that the owner independently purchased Workers Paid ($5/month) and will apply a conservative 50 ms CPU cap. The adapter retains economical caching and request budgets and requires no additional mail service, scheduled job, or resource purchase.

The parent owns authentication, resource creation, the new GitHub repository, push, secrets, DNS and deployment. No remote deployment or repository change was performed by the adapter implementation. The inherited Git remote is not a deployment destination. Use the newly created repository's actual URL; do not assume a repository name or reuse a historical remote. Publish the complete reviewed redesign, not just tracked legacy files, after inspecting the staged changes and Git history.

## Initial release

1. Parent authenticates official Wrangler and creates/selects the database in the account above. Replace the all-zero local-only `database_id` in `wrangler.jsonc` with the actual D1 UUID. IDs are configuration, not secrets.
2. Parent confirms `josiahadeyemo.me` is an active Cloudflare zone and the custom domain can be assigned to this Worker. The configuration intentionally disables `workers.dev` and preview URLs. No `www` alias is required. If desired, parent can add an edge redirect from `www.josiahadeyemo.me` to the canonical apex before exposing the alias; do not add a second allowed contact origin.
3. Run the checks below. Apply the migration before accepting contacts, then deploy using the command below. The deployment preflight refuses the all-zero D1 ID and wrong canonical domain.

```sh
npm ci
npm run lint
npm test
npm run build
npm run audit:public
npm run test:worker
npx playwright install chromium
npm run test:e2e
npm run test:e2e:worker
npm run deploy:check
# Parent only: applies tracked migrations remotely, then deploys assets + Worker.
npm run deploy:cloudflare
```

Wrangler is pinned to `4.131.1`; Miniflare and Worker types match its dependencies. `worker:bundle` uses `wrangler deploy --dry-run` only and does not publish. The project has no `nodejs_compat` requirement: the Worker never imports Node filesystem or SQLite modules.

## CI/CD: Workers Builds first

Parent connects the newly created GitHub repository to **this existing Worker** through Workers Builds, with production branch `main` (or the actual chosen branch). Root directory is the portfolio repository root. Keep non-production deployments disabled for this launch.

- Build command: `npm ci && npm run lint && npm test && npm run build && npm run audit:public && npm run test:worker`.
- Deploy command: `npm run deploy:cloudflare`.
- Build credentials and D1 permissions are managed in Cloudflare by the parent. Do not put a Cloudflare API token in frontend environment variables or public files.
- GitHub Actions runs lint, type checking/build, public-content audit, Express tests, Miniflare tests, and desktop/mobile Playwright checks for both runtimes. Screenshots/traces are CI artifacts, with seven-day retention; no inbox databases are uploaded.
- Require the `verify` job through branch protection before merging. Workers Builds and GitHub checks can run independently on a direct push: wait for the first verification run before the initial publication and use protected merges thereafter.

The Actions deploy job is an **optional fallback**, disabled unless the repository variable `CLOUDFLARE_DEPLOY_ENABLED` is exactly `true`. To use it instead of Workers Builds, parent supplies a scoped `CLOUDFLARE_API_TOKEN` secret and configures the `production` environment. It runs only for `main` after the verify job. Do not enable both deployment systems for the same production branch.

## Local Worker testing

```sh
npm run build
npm run worker:migrate:local
npm run dev:worker
```

Open `http://127.0.0.1:4174`. The development command explicitly sets the local `SITE_ORIGIN`; the production config remains canonical. `npm run dev` and `npm start` retain their Express + local SQLite behavior. `npm run inbox` reads that local SQLite database, not D1. The Worker browser suite uses a separate `.wrangler/e2e-<process>` local state directory; all test fixtures stay ignored. Miniflare unit databases are ephemeral.

Static `dist` is bound through `ASSETS`. Asset-first delivery keeps matching files outside dynamic Worker execution. `/api` and `/api/*` always run the Worker, including navigation requests. `not_found_handling: none` is deliberate: the Worker serves `index.html` for known application routes, validates discovered `github-<id>` project routes, renders unknown extensionless HTML routes with a 404 status, and never turns missing image/JS files or API errors into a 200 HTML response. Direct `/projects`, curated details, and discovered details are covered in workerd tests; browser reloads cover the actual Wrangler adapter.

## Private contacts

Local development uses `--local-upstream 127.0.0.1:4174` so Wrangler does not rewrite the browser Origin to the production host. This changes local tooling only, not the production origin allowlist.

`POST /api/contact` requires JSON, a UUID `Idempotency-Key`, and an exact mandatory `Origin` matching `SITE_ORIGIN`; cross-site fetch metadata is rejected. No CORS permission is emitted. UTF-8 JSON is streamed with a 16 KiB ceiling even without Content-Length; compressed bodies are rejected. Shared Zod validation bounds name, email, service, message and honeypot. Inputs use parameterized D1 queries.

Unique request keys and an atomic D1 batch make retries safe, including concurrent requests. A reused key with a different normalized body returns 409. An existing accepted request can be retried after quota exhaustion. New valid submissions are capped at five per Cloudflare client IP per fixed fifteen-minute window using atomic D1 updates. Fixed windows can allow a boundary burst; this is not a distributed-bot defense. Missing edge IPs share one quota; client-supplied forwarding headers are ignored. Rate identifiers are salted hashes of IP and window, never raw IPs, and expired rows are cleaned on subsequent valid submissions. Validation and origin failures never store a contact. Limiter/storage failures return 503, not a false success.

Contact bodies, bearer tokens, and database error details are not logged by the Worker. There is no public contact list. Health checks return 503 if required migrations are missing. Messages are **stored, not emailed**. Parent must monitor the inbox and define retention/backups; no automatic deletion of contact messages is configured.

### Optional browser review

Parent can set a high-entropy printable `ADMIN_TOKEN` of 32-256 characters using `wrangler secret put ADMIN_TOKEN`. Never place it in `vars`, Git, query strings or a `VITE_` variable. The API remains disabled (404) when the secret is absent or too short.

Visit **https://josiahadeyemo.me/contact-review.html** (Cloudflare may redirect to its clean URL). This static shell contains no contact data. Enter the token on a trusted device. It is sent only in the Authorization header and remains in page memory, not cookies, localStorage, sessionStorage, or URLs. Lock, navigation, or reload clears it. Messages render as text, not HTML; private responses are `no-store` and `noindex`, capped at 100 rows per request. The page defaults to 25 with paging. The shell is publicly reachable but cannot read messages without the secret. No UI delete/export function is present. Rotate the token if exposed.

### D1 CLI alternative

No admin secret or browser page is necessary. From the authenticated parent environment:

```sh
npx wrangler d1 execute josiah-portfolio-db --remote --command "SELECT id,name,email,service,message,created_at FROM messages ORDER BY created_at DESC LIMIT 50"
```

Treat that terminal output as private. Do not paste it into Actions logs, public artifacts, issues or repository files. Use D1's operational backup/restore tools and an owner-approved retention procedure; do not delete or recreate D1 to roll back frontend code.

## GitHub discovery and economic limits

The shared discovery engine preserves curated cards, reviewed release evidence, screenshots, hidden/private/fork/empty exclusions, pagination, first-push probes and safe stale fallback. Worker snapshots persist in D1 and warm isolates reuse a serialized public response for one minute; GitHub refresh has a five-minute interval and coalesces concurrent refreshes. Up to 40 external requests are allowed per refresh, with a ten-second wall-time deadline and four concurrent first-push probes. An exhausted request budget fails back to the existing snapshot rather than omitting curated work. Cache loads do not trigger a new fetch until the saved snapshot's interval expires. Cold isolates can still race each other for a refresh; this is not a global distributed refresh lock.

`GITHUB_TOKEN` is optional and server-only, supplied as a Wrangler secret if unauthenticated GitHub limits become restrictive. No token is needed to show curated work. In-memory snapshots, string reuse and asset-first routing reduce dynamic work, but **local workerd wall times do not certify production CPU usage or the parent's planned 50 ms cap**. Parent must inspect Worker CPU/errors and daily request/D1 usage after launch. Do not upgrade the plan automatically. The account is on the Free plan, where Cloudflare rejects a custom `limits.cpu_ms` (API code 100328), so `wrangler.jsonc` sets none and the plan's own CPU limit applies; add `"limits": { "cpu_ms": 50 }` back only after moving to a paid plan. If refresh CPU/rate failures occur, set `GITHUB_SYNC_ENABLED=false` and redeploy as a temporary fallback while preserving curated releases; investigate before re-enabling.

## Post-deploy acceptance (parent)

Verify HTTPS and `/api/health`, load Home and `/projects` in a fresh browser, navigate directly to a curated detail URL, then reload it. Check `/api/not-found` returns JSON 404 and `/assets/missing.js` returns non-HTML 404. Submit one clearly marked test contact on the canonical site, repeat its UUID/body to confirm the same ID, and inspect it privately in D1. Check an unauthorized inbox request reveals nothing. Confirm GitHub status, project previews and release evidence, then save desktop/mobile screenshots outside public assets. Record the actual deployed commit, Worker version, verification run and timestamp; this implementation does not invent deployment evidence.

Reference behavior: [asset-first Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/), and [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).
