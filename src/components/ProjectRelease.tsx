import type { Project } from "../../shared/schema";
import { releaseLabels } from "../../shared/releases";

export default function ProjectRelease({ project }: { project: Project }) {
  const release = project.release;
  if (!release)
    return (
      <section
        className="release-sheet release-unreviewed"
        aria-label="Release status"
      >
        <p className="eyebrow">Source is not a release certificate</p>
        <h2>Review pending.</h2>
        <p>
          This repository is discoverable on GitHub. Its current setup, tests
          and deployment have not been reviewed for this directory. A repository
          link or screenshot is not evidence of a production service.
        </p>
      </section>
    );
  const setup = new URL(release.setupUrl);
  const commitUrl =
    setup.origin +
    "/" +
    setup.pathname.split("/").filter(Boolean).slice(0, 2).join("/") +
    "/commit/" +
    release.commit;
  return (
    <section className="release-sheet" aria-labelledby="release-title">
      <div className="release-sheet-heading">
        <div>
          <p className="eyebrow">
            Release notes / {releaseLabels[release.stage]}
          </p>
          <h2 id="release-title">What you can use.</h2>
        </div>
        <p>
          Reviewed <time dateTime={release.checkedOn}>{release.checkedOn}</time>
          <br />
          <span>No public deployment verified</span>
        </p>
      </div>
      <p className="release-summary">{release.summary}</p>
      <div className="release-columns">
        <div>
          <h3>Implemented workflow</h3>
          <ul>
            {release.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Boundaries, not fine print</h3>
          <ul>
            {release.limitations.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="release-verification">
        <div>
          <h3>Verification evidence</h3>
          <p>{release.verification}</p>
          <p>
            Evidence applies to the linked revision, not every future repository
            update.
          </p>
        </div>
        <div className="release-links">
          <a href={release.setupUrl} target="_blank" rel="noreferrer">
            Setup and documentation
          </a>
          <a href={commitUrl} target="_blank" rel="noreferrer">
            Reviewed source: {release.commit.slice(0, 7)}
          </a>
          {release.ciUrl && (
            <a href={release.ciUrl} target="_blank" rel="noreferrer">
              View verification run
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
