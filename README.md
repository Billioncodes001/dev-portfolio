# Josiah Adeyemo / Portfolio

A personal portfolio with a React + TypeScript interface, an Express API, and a private SQLite contact inbox. The design uses self-hosted Manrope and Instrument Serif, a warm paper palette, an optional dark theme, and responsive project previews.

## Run locally

Requires Node.js 22.16 or newer. The bundled SQLite API emits an experimental warning on Node 22.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Vite runs on port 5173 and proxies API requests to port 3001. No email provider, database service, or secret is needed.

## Cloudflare Production

The Cloudflare Worker adapter serves the current redesign at **https://josiahadeyemo.me** with static assets, D1 contact storage, public GitHub discovery and optional private contact review. Use the [Cloudflare handoff](docs/CLOUDFLARE.md) for parent-owned D1 configuration, Workers Builds CI/CD, migration, secrets and deployment. The original Express flows remain available below. Never publish `dist` alone if you need the API.

See the [launch content audit](docs/LAUNCH-AUDIT.md): unsupported testimonials, awards/credential claims and unverified article URLs have been removed from both rendered content and raw public JSON. Reviewed project evidence and screenshots are preserved.

## Express Production

```sh
npm ci
npm run build
npm start
```

The Node server serves both the built frontend and API on http://127.0.0.1:3001. This is a server application: uploading only `dist` to a static host will not provide the API or contact form. Build with development dependencies installed; `tsx` is a runtime dependency.

Set environment variables in your deployment or in a local `.env`, using `.env.example` as a reference:

| Variable              | Default                   | Purpose                                                                         |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| `PORT`                | `3001`                    | HTTP server port                                                                |
| `HOST`                | `127.0.0.1`               | Bind address; use `0.0.0.0` inside a container                                  |
| `SITE_ORIGIN`         | Local development origins | Exact public origin, such as `https://portfolio.example`; no path               |
| `DATA_DIR`            | `./data`                  | Private, persistent directory for `messages.sqlite`                             |
| `GITHUB_USERNAME`     | `billioncodes001`         | Public repository owner to showcase                                             |
| `GITHUB_SYNC_ENABLED` | `true`                    | Set `false` to disable discovery                                                |
| `GITHUB_TOKEN`        | Unset                     | Optional server-only token for higher API limits                                |
| `TRUST_PROXY`         | Disabled                  | Trusted proxy address/range, such as `loopback`; do not trust arbitrary clients |

Terminate HTTPS at your reverse proxy and configure HSTS there. Set `SITE_ORIGIN` to the deployed site origin. Keep `DATA_DIR` on a persistent volume, outside `dist` and `public`, and back it up. SQLite is appropriate for one portfolio server; the request limiter is process-local. Multiple server instances would need a shared database and limiter.

## GitHub integration

Work automatically combines the 13 curated showcases with eligible public repositories from **Billioncodes001**. The backend refreshes its cache every five minutes when requested; a visible browser checks every minute. New non-empty public projects normally appear within about six minutes of GitHub indexing them. Existing curated cards are not duplicated. Add the topic `portfolio-hide` to exclude a repository from discovery.

All thirteen curated projects have new, tested source repositories and updated showcase links. All have actual interface screenshots, including the Tkinter desktop app. These are independent local demos, not recovered source histories or official company services. GitHub-discovered projects can receive reviewed local screenshots through `public/profile/repository-previews.json`; App Launch Inspector and Social Claim Verifier are configured there. See [GitHub setup and migration details](docs/GITHUB.md) for configuration, repositories and limitations.

## Reviewed Release Records

`public/profile/releases.json` is a manually reviewed registry keyed by GitHub owner/repository. It attaches setup instructions, workflow notes, limitations, a checked source revision and optional CI evidence to curated and discovered cards. The Work page can filter by maturity; detail pages distinguish local tools and private pilots from public deployments.

Only record capabilities backed by source and tests. GitHub discovery never grants a maturity label automatically. Unknown repositories show **Release not reviewed**, and a repository homepage is explicitly unverified. Evidence applies to the pinned commit, not later pushes. Setup and CI links are validated against the same repository. No current record certifies a public deployment. Restart the backend after changing this registry.

## Contact inbox

The form validates input on both client and server, rejects cross-origin browser submissions, limits payload size and request frequency, and uses idempotency keys to prevent duplicate messages after network retries. Successful submissions are saved in SQLite before success is returned.

```sh
npm run inbox
```

This local CLI displays messages. **Messages are not emailed automatically.** Check the inbox regularly; the direct email link remains available to visitors. There is no public inbox endpoint. Do not publish CLI output or commit the database. Apply your own retention policy when operating the site.

Endpoints:

- `GET /api/health`: server and database readiness.
- `GET /api/portfolio`: validated, aggregated portfolio content.
- `POST /api/contact`: stores a message; requires JSON and a UUID `Idempotency-Key` header.

## Update content

Existing profile records remain in `public/profile/*.json`. The backend validates them with `shared/schema.ts` at startup; restart after editing. Curated project detail URLs derive from project titles unless a stable `slug` is supplied; automatically discovered repositories use stable GitHub IDs. The resume link comes from the Resume entry in `navbar.json`. Routes and navigation are explicitly registered in the frontend so a missing JSON route file cannot silently remove a page.

Add project screenshots to `public/images/projects`, then generate lightweight previews:

```sh
node scripts/optimize-images.mjs
```

The generated WebP files are used by the project cards; original PNGs remain as fallbacks. Optional sections use typography and initials instead of requesting nonexistent blog, certification, or testimonial images.

Owner-supplied work history and education were retained without inventing current dates or qualifications. Unsupported external article, award and testimonial arrays are empty in this release. The canonical origin and existing social image URL are configured for `josiahadeyemo.me`.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests run against the real production server with a separate test inbox under `test-results`. They cover desktop/mobile rendering, navigation, filters, deep links, contact validation and submission, retries, theme persistence, and automated accessibility checks.

If Google Chrome is already installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` can use it without downloading Playwright's browser. Screenshots and failure traces are written to `test-results`.

## Project structure

- `src/`: interface, route components, shared UI, and cancellable data loading.
- `shared/schema.ts`: common runtime validation and TypeScript types.
- `server/`: content loading, HTTP API, persistence, and inbox CLI.
- `tests/`: production browser tests.
- `public/profile/`: editable portfolio content.

See [the review notes](docs/REVIEW.md) for the baseline findings and content limitations.

## Attribution

Originally based on [Mayank Agarwal's Dev Portfolio](https://github.com/mayankagarwal09/dev-portfolio). The original MIT copyright and license are preserved in [LICENSE.md](LICENSE.md).

## Biography and gallery

The biography uses Comr. Josiah Adeyemo and the owner-confirmed union roles: Assistant General Secretary (2025), Zonal Coordinator (2026). Edit `public/profile/leadership.json` for roles and source links, `public/profile/about.json` for the bio, and `public/profile/gallery.json` for images, alt text and captions. Both Express and the Cloudflare Worker load these records.

Gallery files are versioned under `public/images/` and copied by Vite into `dist/images/`; Cloudflare serves the built `dist` directory through its ASSETS binding. All current gallery files are already in the repository. New event photos can be added here after the owner supplies the cloud source. Remote image URLs are not currently supported by the schema/CSP; import approved images locally or deliberately configure the chosen image host. Do not put private files or original cloud credentials in `public`.
