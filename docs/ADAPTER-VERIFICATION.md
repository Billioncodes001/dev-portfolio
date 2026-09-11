# Worker adapter verification

Completed locally on 2026-09-11, approximately 18:10 UTC, in the exclusive deployment copy. This is local implementation evidence, not a claim that production is deployed. The original source repository was not edited. No commit, push, Cloudflare resource creation, secret installation, or remote deploy was performed.

## Final checks

| Command | Result |
| --- | --- |
| `npm run build` | PASS: main and Worker TypeScript targets, including new tests/audit script; Vite production build |
| `npm run lint` | PASS |
| `npm test` | PASS: 22 Express/shared tests |
| `npm run test:worker` | PASS: Wrangler 4.131.1 dry-run bundle; 12 Miniflare/workerd + D1 tests |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` | PASS: 28 desktop/mobile tests against production Express, 22.3 seconds |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e:worker` | PASS: 28 desktop/mobile tests against local Wrangler + isolated D1, 24.1 seconds |
| `node --import tsx scripts/audit-public.ts` | PASS: 244 source/build files, 114 image-reference checks; unsupported arrays empty |
| `git diff --check` | PASS |
| npm install dependency audit | 431 packages audited, zero reported vulnerabilities at check time |
| `npm run deploy:check` | EXPECTED BLOCK: actual parent-owned D1 ID has not been provided; all-zero sentinel is rejected |

90 final automated tests passed, plus build/lint/content checks. No tests were skipped in these final runs. Browser runs use installed Chrome, with desktop and emulated mobile viewports, not physical mobile devices. The same workflow installs Playwright Chromium in GitHub CI; the remote CI run is parent-owned and not yet observed.

Local test runners needed sandbox escalation for loopback listeners and browser processes. No remote API authentication was used. Harmless upstream Zod/Rollup annotation warnings and Node's experimental SQLite warning remain.

## Worker coverage

- Content parity with Express, including curated screenshots and reviewed release evidence.
- Fresh HTML navigation to `/projects`, curated project detail paths and discovered `github-<id>` routes, plus deep-link browser reloads. Unknown extensionless pages retain 404 status; missing scripts/images and API routes never return a misleading SPA 200.
- D1 durable writes, UUID normalization, identical retry IDs, conflicting payload rejection, concurrent duplicate protection, parameterized inserts and absence of public message reads.
- Mandatory exact Origin, cross-site rejection, no CORS preflight grant, input schemas, media/encoding rejection, malformed JSON, 16 KiB declared/streamed body limits and honeypot handling.
- Atomic five-per-fifteen-minute IP quota, concurrent requests, Retry-After, forged forwarding-header resistance, hashed rate identifiers and retry after quota exhaustion.
- Bearer-only private review, missing-secret disablement, bounded pagination, no-store output and no internal idempotency fields in private responses. Browser shell keeps the token out of storage and renders malicious-looking text without HTML execution.
- Missing migrations fail health and submission closed; schema migration restores readiness.
- Mocked public GitHub discovery persists D1 snapshot data; 25 warm polls return an identical 30,619-character response with no additional upstream fetch. Final run took 36 ms total local wall time, not production CPU time.

The runtime tests caught and fixed two integration issues before handoff: Cloudflare fetch does not support `redirect: error` (now manual redirect handling, no follow), and Wrangler's local proxy rewrites the Origin unless `--local-upstream` is set. Production still requires the exact configured canonical Origin.

## Screenshot evidence

The retained [desktop hero](evidence/desktop-hero.png), [mobile hero](evidence/mobile-hero.png), [desktop release record](evidence/desktop-release-evidence.png) and [mobile release record](evidence/mobile-release-evidence.png) come from the final local Wrangler browser run. They are copies of actual test captures, not generated mockups. Desktop hero was visually inspected; automated image/overflow/accessibility checks cover both viewports. These screenshots do not prove a public deployment.

Original project screenshots and `public/profile/releases.json` are preserved. Additional final browser captures remain in ignored `test-results`; no inbox databases are included in the evidence directory or CI artifacts.

## Changed files for this adapter

This inventory is relative to the supplied dirty redesign, not `git diff HEAD` (which also includes the pre-existing redesign).

| Area | Added or edited files |
| --- | --- |
| Worker/D1 | `wrangler.jsonc`, `migrations/0001_contact.sql`, `worker/index.ts`, `worker/content.ts`, `worker/security.ts`, `worker/store.ts`, `worker/worker.test.ts`, `worker/tsconfig.json` |
| Shared/local discovery | `shared/github.ts`, `server/github.ts` |
| Build/verification | `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`, `playwright.config.ts`, `.gitignore`, `scripts/audit-public.ts`, `scripts/check-deployment.mjs`, `.github/workflows/ci.yml` |
| Public hardening/content | `index.html`, `public/_headers`, `public/profile/testimonials.json`, `public/profile/achievements.json`, `public/profile/blog.json`, `src/components/Testimonials.tsx`, `src/components/Achievements.tsx`, `src/components/Blog.tsx` |
| Private review shell | `public/contact-review.html`, `public/contact-review.css`, `public/contact-review.js`, `tests/admin.spec.ts` |
| Content regression guard | `tests/public-content.spec.ts` |
| Handoff/evidence | `README.md`, `docs/REVIEW.md`, `docs/CLOUDFLARE.md`, `docs/LAUNCH-AUDIT.md`, this report, `docs/evidence/README.md`, four screenshot files above |

Removed copied `.DS_Store` files from public/build assets. Build output and local test state are generated/ignored, not source changes. No existing redesign files were reverted, no source project/release images were replaced, and Git remotes/index/history were not changed.

## Parent-owned release gates

Provide the actual D1 UUID and the selected paid-plan 50 ms CPU cap, authenticate Wrangler, configure the new GitHub repository and Workers Builds, apply remote migrations, assign the canonical custom domain and deploy. Optional ADMIN_TOKEN remains unset. Actions deploy stays disabled unless explicitly enabled as a fallback. Live DNS/HTTPS, production CPU/quotas, real GitHub limits, and the final deployment version/commit must be verified after publication. Follow [CLOUDFLARE.md](CLOUDFLARE.md); do not fabricate production evidence from these local checks.
