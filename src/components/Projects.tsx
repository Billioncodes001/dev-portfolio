import { useDeferredValue, useState } from "react";
import { ArrowUpRight, Github, Search, X } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { ContactBanner, PageIntro, ProjectCard, projectSlug } from "./UI";
import { releaseLabels } from "../../shared/releases";

const filters = [
  "All work",
  "GitHub",
  "React",
  "Angular",
  "Python",
  "PHP",
  "Mobile",
];
export default function Projects() {
  const data = usePortfolio();
  const [filter, setFilter] = useState("All work");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const query = useDeferredValue(search.trim().toLowerCase());
  const projects = data.projects.filter((project) => {
    const tags = project.tags.join(" ").toLowerCase();
    const matchesFilter =
      filter === "All work" ||
      (filter === "GitHub"
        ? Boolean(project.repository)
        : filter === "Mobile"
          ? /\b(?:flutter|android|dart|react native|expo|ios)\b/.test(tags)
          : tags.includes(filter.toLowerCase()));
    return (
      matchesFilter &&
      (!stage ||
        (stage === "private-source"
          ? project.sourceVisibility === "private"
          : stage === "unreviewed"
            ? !project.release && project.sourceVisibility !== "private"
            : project.release?.stage === stage)) &&
      (project.title + " " + project.bodyText + " " + tags)
        .toLowerCase()
        .includes(query)
    );
  });
  return (
    <>
      <PageIntro
        label="Selected work / The project archive"
        title="Ideas made"
        accent="real."
      >
        <p>
          Web platforms, useful tools, and experiments along the way.
          <br />A collection of the problems I've helped turn into products.
        </p>
      </PageIntro>
      {data.github && (
        <div className="container github-connection">
          <div>
            <Github size={21} />
            <div>
              <strong>Fresh from GitHub</strong>
              <p>
                {data.github.status === "unavailable"
                  ? "Repository updates are temporarily unavailable. Selected work is still here."
                  : data.github.status === "cached"
                    ? "Showing saved public repositories while GitHub reconnects."
                    : "Public projects from @" +
                      data.github.username +
                      ". Updated automatically."}
              </p>
            </div>
          </div>
          <a
            className="text-link"
            href={"https://github.com/" + data.github.username}
            target="_blank"
            rel="noreferrer"
          >
            View GitHub <ArrowUpRight size={16} />
          </a>
        </div>
      )}
      <section className="container projects-section">
        <div className="project-toolbar">
          <div className="filter-list" aria-label="Filter projects">
            {filters.map((item) => (
              <button
                key={item}
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
                className={filter === item ? "selected" : ""}
              >
                {item}
                {item === "All work" && <span>{data.projects.length}</span>}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search projects"
              type="search"
              placeholder="Find a project..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="release-filter">
          <label>
            Release maturity
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
            >
              <option value="">All release stages</option>
              {Object.entries(releaseLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="unreviewed">Not reviewed</option>
              <option value="private-source">
                Private source / Case study
              </option>
            </select>
          </label>
          <p>
            Working software, with its limits visible. Open a project for setup,
            release notes and verification evidence.
          </p>
        </div>
        <p className="result-count" role="status">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              project={project}
              index={data.projects.indexOf(project)}
              key={projectSlug(project)}
            />
          ))}
        </div>
        {projects.length === 0 && (
          <div className="empty-state">
            <Search size={32} />
            <h2>No matches this time.</h2>
            <p>Try another technology or a different search.</p>
            <button
              className="button"
              onClick={() => {
                setFilter("All work");
                setSearch("");
                setStage("");
              }}
            >
              Clear filters <X size={16} />
            </button>
          </div>
        )}
      </section>
      <ContactBanner />
    </>
  );
}
