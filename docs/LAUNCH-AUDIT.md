# Public launch audit: 2026-09-11

Scope: the copied, current redesign only. No edits were made to the original source repository, and no commit, push or remote deployment was performed during implementation.

## Removed from this release

- All six inherited named testimonials and their unsupported metrics/attributions, including raw public JSON. `testimonials` is now empty.
- All eight inherited awards/certifications, placeholder-looking credential identifiers and award statistics, including raw public JSON. `achievements` is now empty.
- All six unverified article/title destinations, including raw public JSON. `blogs` is now empty.
- Twenty dead image references attached to those entries and macOS `.DS_Store` metadata copied into public assets.

The three routes remain accessible in the established paper design, with neutral messages and links to reviewed project work. The original unmodified source remains outside this deployment copy; no archive of the removed claims was added to published assets or this repository. Tests assert the public arrays stay empty for this release and the API/UI do not resurrect those records. Reintroducing verified material requires deliberately updating the launch audit gate.

## Preserved with provenance limits

The supplied name, roles/interests, biography, social/email links, work history and education remain owner-original facts, not newly independently verified claims. An employment entry still says Present; degree labels and historical numeric employment claims are retained as supplied and must be reviewed by the owner. No new employer, credential, endorsement, client outcome or rating was invented.

The thirteen curated project descriptions and actual local screenshots remain intact. The inherited reviewed release manifest is preserved, with source revisions, CI links and explicit limits. Those records are historical evidence, not a fresh certification of all linked repositories or a public deployment claim. GitHub discoveries remain unreviewed unless matched to the local release manifest. The portfolio's own deployment must be recorded by the parent after it actually occurs.

The resume destination and external social links are not re-certified by this technical audit. Original employment/education data and these links were not changed or fabricated to fill gaps.

## Technical audit

`npm run audit:public` validates profile schemas, scans text assets under public and dist for common credential/private-key patterns and machine-local paths, rejects private-looking files/symlinks, validates referenced local images, and requires unsupported testimonial/award/article arrays to be empty. It is a heuristic check, not a guarantee that all possible secrets are absent. Public source and built bundles must both pass after the final build. The worker bundle and its source map remain in ignored `.worker-build`, never `dist`.

The canonical domain is `https://josiahadeyemo.me`; the existing social image is preserved, now with an absolute canonical URL. The stale Git remote was not changed by this adapter; parent must set the actual new repository URL before pushing and separately review history for sensitive material.

## Operational gates

Real D1 UUID, Cloudflare authentication, new repository creation/push, Workers Builds integration, DNS/custom domain, optional admin secret and actual deployment are parent-owned. No production contacts, secrets or deployment evidence are created by local tests. Production CPU and live DNS/HTTPS cannot be certified by a local build. The parent reports the owner's independent Workers Paid purchase and will configure the 50 ms CPU cap; no account purchase or upgrade was performed by this implementation.
