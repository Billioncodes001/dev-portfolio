# Portfolio review and rebuild

For the current release, [LAUNCH-AUDIT.md](LAUNCH-AUDIT.md) and [CLOUDFLARE.md](CLOUDFLARE.md) supersede the historical content and hosting notes below. Unsupported testimonial, award/credential and article arrays have been removed from this release, not merely hidden. Historical verification counts below are not the new adapter's test report.

## Baseline findings

- Type checking failed because React 19 type definitions were installed alongside React 18 and older markdown dependencies.
- The application mixed React Router 5 and 6 dependencies. Route components were created inside a render and an import error was replaced by a permanent spinner.
- Several fetch handlers swallowed errors and never stopped loading. The shared fetch hook did not cancel requests, allowing stale results to replace newer data.
- The desktop navigation was configured to collapse at every screen size. Fixed viewport heights, nested scrolling, and a fixed 5em heading made the layout fragile.
- Bootstrap, styled-components, theme hooks, multiple timeline packages, and separate animation styles duplicated presentation responsibilities.
- The only test expected the starter template's 'learn react' link and did not represent the application.
- The web manifest identified a different developer; metadata used `your-domain.com`.
- Optional sections referenced nonexistent images and Font Awesome icons without an installed icon font.
- Project PNGs were several megabytes each.
- The project had no backend or functioning contact submission endpoint.

## Implemented

The current application uses explicit, module-level lazy routes; a cancellable and validated profile request; recoverable error states; a responsive shared stylesheet; self-hosted fonts; consistent SVG icons; project search and filters; project detail routes; keyboard-accessible navigation; theme persistence; reduced-motion support; and a real contact form.

The Express API validates profile data before startup, validates incoming messages, restricts browser origins, limits body size and request frequency, persists messages with parameterized SQL, and deduplicates client retries. Private messages are available only through a local CLI. Production hosting includes direct-link fallback and distinct API/file errors.

The CRA dependency stack was replaced with Vite, the React type versions were aligned, and vulnerable router/image-processing dependencies were updated. Package-lock is now tracked.

Unused starter components, duplicate stylesheets, and the obsolete public HTML entry were removed. The original source was retained outside this deployment copy; no legacy archive is served by the site.

## Content that needs the owner's verification

- Existing testimonials and certification/award claims have not been independently verified. Generic organization links are labelled as organization links, not credential verification.
- Several experience entries and project destinations are historical, including an entry marked Present. Current employment dates were not inferred.
- The degree labels and institution names were preserved as supplied.
- Repeated RSA/Firebase/fingerprint claims and obsolete technology tags were removed from the rebuilt showcase descriptions. New text describes demonstrated functionality, not invented historical results.
- External project, article, resume, and credential destinations may change; this work verifies the local app, not ownership or continued availability of third-party pages.
- Add the final production origin and absolute social image URL when a domain is selected.

## Verification results

- TypeScript checks, ESLint, the production build, and `git diff --check` pass.
- Twenty-two backend tests and twenty-four production browser tests pass. The GitHub integration covers discovery, cache, outage, duplicate, zero-size-first-push, bounded batch verification, reviewed screenshots and dynamic routes. The one-time product batch adds manually reviewed release records, repository-bound source/CI links, maturity filtering and explicit limits; unreviewed discoveries are never automatically certified.
- Browser coverage includes 320-1920px widths and automated WCAG A/AA checks on Home, Work, and Contact in both themes.
- The dependency audit reports zero known vulnerabilities at the time of this review.
- Oversized legacy PNG previews were converted to WebP. The twelve rebuilt web showcases now use optimized screenshots of their actual tested interfaces.
- The build emits two harmless upstream Zod/Rollup comment-annotation warnings. Node 22 also reports its SQLite API as experimental.

## GitHub integration and rebuilt showcases

The one-time product-upgrade batch is documented in `../showcase-rebuilds/PRODUCT_ROADMAP.md` relative to the portfolio root. It supersedes the initial workflow counts below: shared QA now has 28 desktop/mobile cases, with additional complete workflows in each repository. Eight app images were refreshed from real browser captures. Public deployment, live message providers, live X compatibility and native device installation remain separate unverified gates. The hourly improvement automation is paused and must not resume. Portfolio edits remain local alongside the pre-existing redesign; no blanket portfolio commit was made.

The new account's public repositories are now merged into Work with five-minute server caching and one-minute visible-client refresh. All thirteen curated showcases now point to independently rebuilt repositories. New screenshots, descriptions and technology tags match the implementations. Company-inspired studies are explicitly labelled independent demos, not recovered originals or official services. The live API returned all seventeen eligible projects without duplicate cards.

All thirteen repositories were published to Billioncodes001, and all thirteen GitHub Actions verification runs passed. Separate local suites passed twenty-four desktop/mobile browser workflows across twelve web rebuilds, including automated accessibility checks. The seven new apps passed twenty-eight domain/HTTP tests; the earlier six passed their core tests, including an actual Tkinter GUI smoke test. These checks exposed and corrected a stylesheet/CSP conflict, mobile wrapping, desktop clipping, insufficient contrast, malformed filter options and a GitHub batch-refresh timeout. See GITHUB.md for links, scope and operations.

## Operations

The contact form stores messages locally. It does not send email or notify an external service. Run `npm run inbox` to read messages and keep the database on persistent storage. The direct mail link is an alternative path for visitors.

Automated checks do not replace assistive-technology testing or a content review. This rebuild does not constitute a guarantee of defect-free software.
