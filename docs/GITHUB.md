# GitHub discovery and showcase migration

## Automatic discovery

The Express backend reads public repositories from **Billioncodes001**. The portfolio does not require a visitor login, the GitHub CLI, or a token in the browser.

- The server caches the public repository list for five minutes and coalesces concurrent refreshes.
- An open, visible browser refreshes portfolio content every minute and when focused. Existing forms and filters remain mounted.
- A newly published, non-empty public repository normally appears within about six minutes of being indexed by GitHub and the site receiving requests. This is polling, not an instantaneous webhook.
- GitHub can report size zero after a successful first push. Zero-size repositories are checked for commits rather than blindly discarded, and proof is reused until their push timestamp changes.
- Commit checks run in bounded batches of four, preserving repository order without serial checks exhausting the refresh deadline after a batch publication.
- Repositories must be owned by the configured account. Private, empty, forked, archived, disabled and profile repositories are excluded.
- Add the GitHub topic portfolio-hide to omit a repository from automatic discovery.
- Curated project links are matched by owner/repository, case-insensitively. A rebuilt curated project receives repository metadata instead of a duplicate card.
- Generated project routes use GitHub's numeric repository ID, so renaming a discovered repository does not change its portfolio route.
- Descriptions, languages, topics and valid HTTP(S) homepage links populate discovered cards. Reviewed local screenshots for discovered repositories are configured in `public/profile/repository-previews.json`, keyed by `owner/repository` (case-insensitive). This does not promote or duplicate a discovered card, change its stable route, or override an existing curated image. Screenshots remain available during GitHub outages. Repositories without configured screenshots use the portfolio's typographic preview.
- GitHub failures preserve the curated projects and last successful public snapshot, with a cached/unavailable status. The server backs off after rate limits. The disk snapshot is restored for up to 24 hours after a restart.

Configuration is in .env.example. GITHUB_USERNAME defaults to billioncodes001. GITHUB_SYNC_ENABLED=false disables discovery. An optional GITHUB_TOKEN improves server-side rate limits; it must never be named VITE_GITHUB_TOKEN or placed in public content. No token was copied from the developer's GitHub credentials into this project.

The server's persistent DATA_DIR contains github-cache.json and the separate private contact inbox. Do not publish that directory. Run the Express backend in production; static-only hosting cannot perform this synchronization.

## Rebuilt repositories

All thirteen curated showcases now have independently written replacements, tested locally, committed and published under the new account. These builds use the supplied descriptions and visual references; no original source, commit history or former deployment was recovered.

| Showcase                           | New repository                                                                        | Implementation                       |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| Url Shortener                      | [url-shortener](https://github.com/Billioncodes001/url-shortener)                     | Flask, Jinja2, SQLite                |
| Bulk SMS Client App                | [sms-email-gateway](https://github.com/Billioncodes001/sms-email-gateway)             | Consent-aware test outbox and signed local callbacks; no live delivery |
| Staff Management System            | [staff-management-system](https://github.com/Billioncodes001/staff-management-system) | Reviewed CSV intake, lifecycle history and operator backup/restore |
| Angular Mini Projects              | [angular-mini-projects](https://github.com/Billioncodes001/angular-mini-projects)     | Browser-only CSV/JSON cleanup, reversible previews and exact numbers |
| Task Tracker                       | [task-tracker](https://github.com/Billioncodes001/task-tracker)                       | Angular 21, Express, SQLite          |
| Polytechnic Students Record System | [student-record-system](https://github.com/Billioncodes001/student-record-system)     | Python, Tkinter, atomic JSON         |
| Korpeatech | [korpeatech-showcase](https://github.com/Billioncodes001/korpeatech-showcase) | Orange private scope studio; immutable briefs and handoffs |
| CampusHub | [campushub-marketplace](https://github.com/Billioncodes001/campushub-marketplace) | Green invited-account resale pilot; owned listings and two-sided handover |
| Billioncodes Software Inc. | [billioncodes-studio](https://github.com/Billioncodes001/billioncodes-studio) | Editorial private proposal desk; exact operator-entered pricing |
| Nifty's | [niftys-gallery](https://github.com/Billioncodes001/niftys-gallery) | Crimson artist catalogue; attribution and frozen exhibition sequences |
| Billups | [billups-media-planner](https://github.com/Billioncodes001/billups-media-planner) | Blue/teal quote intake; exact budgets and immutable campaign sources |
| LibertyMutual / Coverline | [insurance-quote-demo](https://github.com/Billioncodes001/insurance-quote-demo) | Yellow/navy private offer evidence and frozen comparisons; no recommendations |
| Vidly | [vidly](https://github.com/Billioncodes001/vidly) | Cinematic private copy inventory, stock-safe lending and overdue history |

The seven company/movie demos use native browser JavaScript, Node.js and SQLite, with different layouts, typography, palettes and domain interactions. Descriptions and technology tags now describe the actual implementations. Obsolete live links were removed rather than relabelled as working deployments. Twelve web showcases use screenshots of the rebuilt interfaces with synthetic test data. Each repository includes setup instructions, tests and a read-only GitHub Actions verification workflow.

The student-record showcase also has an actual Tkinter desktop screenshot. App Launch Inspector, Social Claim Verifier and X Browser MCP have actual interface previews in the discovery mapping and GitHub READMEs. Registrar's capture uses disposable fictional records; the other captures use isolated test backends without customer accounts, live X access or model requests.

Company-inspired projects are explicitly independent rebuilds, not official company services. They bind to loopback, with private operator gates or invited CampusHub accounts, CSRF checks, validation and bounded storage. Operators can enter their own records, but no real customer data was used for testing. There is no public deployment, payment processing, policy issuance, live messaging, NFT minting or streaming. Do not expose these workspaces publicly without a deployment and security review.

## Reviewed Release Evidence

`public/profile/releases.json` is an explicit review registry, separate from automatic GitHub discovery. Each record pins capabilities and limits to a reviewed source commit and can link the repository's CI run. Work cards expose maturity filters; project details show setup, checks and limitations. Unreviewed new repositories remain "Review pending" rather than inheriting certification from their descriptions. A repository homepage is an unverified link, not proof of a live deployment.

The 2026-09-10 one-time improvement batch refreshed eight web-app screenshots and added the release evidence UI. Portfolio verification passed 22 backend tests, 24 desktop/mobile tests, lint and a typechecked build. The shared rebuild suites passed 28 browser cases; complete private workflows have additional repository-owned tests. The hourly improvement automation is paused and will not resume. Existing unrelated portfolio redesign changes remain local and were not published by this batch. See the sibling `showcase-rebuilds/PRODUCT_ROADMAP.md` for per-project source revisions, CI links and remaining external-service/native gates.

## Local verification

Sibling source directories live in ../showcase-rebuilds. Each has its own README and core test command. A shared qa directory contains desktop/mobile Playwright workflows and screenshot generation; it runs against isolated test databases. The student app includes an actual GUI smoke test. Test passwords are local fixtures, not deployment credentials.

Portfolio tests additionally cover public-only discovery, pagination, caching, outages, rate-limit backoff, duplicate detection, stable routes, in-place refresh and contact-draft preservation.

To open the seven new demos together, run `node preview-all.mjs` from `../showcase-rebuilds/qa`, then visit http://127.0.0.1:5200. The individual apps run on ports 5201-5207. Stop these previews before running their browser tests, which use the same ports with isolated data.

## Initial Rebuild Verification (Historical)

On 2026-09-10 the live local API returned 17 projects: 13 curated showcases plus four discovered repositories. All 17 were associated with the new GitHub account without duplicates. All thirteen initial implementations had successful GitHub Actions verification runs. Portfolio verification passed 18 backend tests and 22 browser tests, including screenshot loading on Work and detail pages, case-insensitive preview matching and cached-feed preservation. The rebuild QA suites passed 24 desktop/mobile browser workflows across twelve web apps, plus 28 domain/HTTP tests for the seven new apps, the original six projects' core tests, and the Tkinter GUI smoke test.
