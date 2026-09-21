# Reviewed project case studies

Public presentation does not require public application source. These case studies publish only owner-approved descriptions and reviewed screenshots; the four source repositories remain private.

| Project                             | Public material                             | Source / release boundary                                       |
| ----------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| [OSINT / Neural](osint-neural.md)   | Public explorer and landing-page capture    | Private source; hosted catalog has no background job API        |
| [Vantage](vantage.md)               | Public pilot landing page and architecture  | Private source and evidence; no forensic accuracy certification |
| [Overlay Studio](overlay-studio.md) | Public preview and architecture             | Private source and packages; no live paid checkout              |
| [MyMecho](mymecho.md)               | Synthetic September 10 Android demo screens | Private source; connected work is not a promoted release        |

## Publication pipeline

1. Review the actual project state, rights, secrets and test results. Do not publish an entire personal workspace.
2. Capture public pages in a fresh signed-out browser, or use clearly identified synthetic fixtures. Inspect the image before copying it into `public/images/projects/`.
3. Add the curated card in `public/profile/projects.json`. Private-source cards link here, never to inaccessible repositories, private releases or customer workspaces.
4. For public repositories, add their image to `public/profile/repository-previews.json`. GitHub discovery deduplicates a curated card linked to the repository root.
5. Run portfolio lint, tests, build, public-asset audit, Worker tests and browser checks. The content and screenshots deploy with the same tested portfolio commit through Workers Builds.

`scripts/capture-project-previews.mjs` captures the four public web landing pages deliberately, outside CI. External availability is not a build dependency. MyMecho's montage uses the three reviewed demo captures already documented in its private README; it is not a new app release screenshot.

Documentation-only changes in private projects do not make their source public. Changes to hosting access, GitHub app permissions or repository visibility require a separate decision.
