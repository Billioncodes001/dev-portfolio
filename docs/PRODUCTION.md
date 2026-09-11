# Production release

Live portfolio: https://josiahadeyemo.me
Repository: https://github.com/Billioncodes001/dev-portfolio

Cloudflare Worker `josiah-portfolio` and D1 `josiah-portfolio-db` are deployed. The production database ID is tracked in `wrangler.jsonc`. The private admin token remains an encrypted Worker secret, never a public asset or GitHub file.

## Deployment flow

Workers Builds is connected to `main`; preview-branch builds are disabled.

- Build: `npm run lint && npm test && npm run build && npm run audit:public && npm run test:worker`
- Deploy: `npm run deploy:cloudflare`

GitHub Actions independently runs all 90 backend and desktop/mobile browser checks. The release at `fb4076c` passed verification on 2026-09-11. Direct pushes can deploy before independent browser checks complete; prefer reviewed merges and inspect both systems. The optional Actions deploy job remains disabled to avoid competing deployment pipelines.

The build token permits Workers and D1 deployment in the selected account, with route/zone access restricted to josiahadeyemo.me and learnatbillioncodes.com. It has no unnecessary AI, R2, KV, queue, container or email privileges.

## Operations

Private contact review: https://josiahadeyemo.me/contact-review.html. Use the separately provisioned token on a trusted device. The token is memory-only in the page and clears on reload. Contacts are saved to D1, not emailed; review this inbox manually and define retention/backups before sustained collection.

HTTPS smoke checks verified health, public data, durable contact storage, replay protection, changed-payload rejection, origin enforcement and authenticated review. The live feed showed 20 projects and both new site previews decoded successfully.

The owner chose Workers Paid ($5/month plus usage), shared with the academy. The configured 50 ms per-request CPU cap is not a monthly spending cap. No additional hosting was purchased, and no cron jobs were added.
