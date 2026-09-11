# Biography research — 11 September 2026

## Identity and editorial basis

The existing portfolio identifies its owner as Josiah Adeyemo and links to LinkedIn `/in/josiah-adeyemo` and GitHub `billioncodes001`. The user supplied “Kome Josiah Adeemo”; that exact spelling did not yield reliable results. The owner confirmed the preferred public display name as “Comr. Josiah Adeyemo” during this task; the site now uses that name.

Tribune explicitly connects Comrade Adeyemo Josiah Kayode with the alias “Billioncodes”, providing the bridge between the software and union profiles. Do not conflate this profile with the civil engineering academic or the Australian Amnesty International profile sharing the same name.

## Sources used

- [LinkedIn](https://ng.linkedin.com/in/josiah-adeyemo): matches the portfolio link, software background, Osun location, Federal Polytechnic Ede education, and Pairview association. Search-indexed content was available; a direct fetch was rate-limited. Employment dates and full responsibilities were unavailable.
- [NANS executive directory](https://nanssouthwest.org.ng/executives): 2026 directory lists Comrade Josiah Adeyemo as Zone D Coordinator.
- [The Sun, 26 April 2026](https://thesun.ng/adeleke-urges-responsible-leadership-as-nans-south-west-inaugurates-mew-leadership/): reports inauguration of the executive council led by Josiah Adeyemo. This is an inauguration date, not an assumed start date; March coverage already identifies him as Coordinator.
- [Tribune, 26 May 2026](https://tribuneonlineng.com/nans-southwest-congratulates-newly-elected-national-president-on-victory/): explicitly identifies the Coordinator as Comrade Adeyemo Josiah Kayode, also known as Billioncodes.
- [Tribune, 21 October 2024](https://tribuneonlineng.com/nans-zone-d-hails-osun-govts-commitment-to-students-welfare/): newly elected Assistant General Secretary, student welfare and transparent communication.
- [Tribune, March 2025](https://tribuneonlineng.com/nans-petitions-tinubu-seeks-justice-for-five-uniosun-students-killed-in-auto-crash/): further public record of the ASG role; describes a petition dated 24 March 2025. Allegations in that reporting are not presented as proven facts in the portfolio.
- [Osun Defender, 18 March 2026](https://osundefender.com/nans-occupies-osogbo-protests-epileptic-power-supply/): reports leadership of an electricity-related student demonstration in Osogbo. The site says advocacy occurred, not that it resolved electricity problems.
- [Medium, 17 January 2023](https://medium.com/@jhardeyemor/unlocking-the-potential-of-connecting-african-tech-talent-with-international-companies-3ec008a0577d): first-person writing about Billioncodes, African talent, online education and international companies. Search-indexed text was available; direct retrieval failed. Treat as the author's stated mission, not independently audited business impact.
- [Medium, 13 July 2024](https://medium.com/@jhardeyemor/expressions-first-the-foundation-for-aspiring-developers-9d994d78c409): additional verified writing lead about regular expressions.

## Items requiring the owner's details

- Pairview role/title, dates and responsibilities. LinkedIn identifies the company, but does not expose complete details. Third-party staff directories suggest Frontend Engineer (Remote), insufficient for adding a dated job history.
- Current employment and whether the existing CampusHub “Nov 2020 – Present” entry remains current. Existing professional entries were preserved, not independently verified.
- Exact months are not stated. The owner confirmed the displayed years: Assistant General Secretary in 2025 and Zonal Coordinator in 2026.
- Education: existing data calls the 2019–2021 Ede qualification a BSc; confirm the exact award. The Sun names OSCOHTECH in its 2026 report; do not infer an additional qualification or graduation date.
- Existing writing/recognition/testimonial content was not fully audited in this change. Several old writing links were not corroborated by this research; review them before presenting them as verified publications.
- The owner confirmed event/union photos will be uploaded to a cloud source later. Add them once the source, captions, dates and credits are available. No news images were copied and no event photographs were fabricated.

## Gallery maintenance

Edit `public/profile/gallery.json` and add images under `public/images/`. Each item needs a unique id, title, category, image path, alt text and caption. Use descriptive alt text and accurate event dates/credits. The current four items use existing repository assets: one portrait and three 2026 independent interface rebuilds, explicitly labelled to avoid conflating them with historical employer projects.

Union entries and source links live in `public/profile/leadership.json`. Biography text lives in `public/profile/about.json`. The shared schema validates these fields through the existing portfolio API. `/gallery` is included in navigation, page metadata and the server's route list.

The initial implementation was local. The production update is applied to the live `Billioncodes001/dev-portfolio` repository and uses Cloudflare Workers Builds on pushes to main, with independent GitHub Actions verification. The optional Actions deployment job remains disabled.

## Validation

Production build and lint passed. All 22 backend tests passed. The 18 existing portfolio browser checks passed across desktop/mobile; all four new gallery, biography, keyboard and accessibility checks passed after disabling entrance animation in the accessibility test. Visual screenshots of the updated pages were reviewed on desktop and mobile.

## Owner-confirmed correction

The owner confirmed Assistant General Secretary in 2025 and emergence as Zonal Coordinator in 2026. These are the dates used in the biography and leadership timeline, superseding the earlier broad 2024–2025 label.

## Production asset verification

All four gallery images are Git-tracked under `public/images`. Vite copies their bytes unchanged to `dist/images`; each built image was fully decoded successfully. The production public-asset audit passed, including checks for missing paths and all skill icon formats. Cloudflare imports gallery and leadership JSON through `worker/content.ts`; the Express loader uses the same records. Production metadata, Worker configuration, and previously repaired assets were preserved.

## Live release verification

Feature commit: `8f8e0986d74c3959af18981d489f5bfa064b7c5a`. GitHub verification run `34642013691` passed both runtime/browser suites. Cloudflare Workers Builds published version `c88f540f-be4f-4597-a004-ed87e44f58c8` at 2026-09-11 20:03 UTC. The live API returned Comr. Josiah Adeyemo, Assistant General Secretary (2025), Zonal Coordinator (2026), and four gallery records.
