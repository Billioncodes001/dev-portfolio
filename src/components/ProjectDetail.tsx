import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import ProjectRelease from "./ProjectRelease";
import {
  ContactBanner,
  Markdown,
  PageIntro,
  ProjectVisual,
  projectSlug,
} from "./UI";

export default function ProjectDetail() {
  const { slug } = useParams();
  const data = usePortfolio();
  const index = data.projects.findIndex(
    (project) => projectSlug(project) === slug,
  );
  const project = data.projects[index];
  if (!project)
    return (
      <section className="load-state">
        <h1>Project not found.</h1>
        <Link className="button primary" to="/projects">
          Explore all work
        </Link>
      </section>
    );
  return (
    <>
      <div className="container breadcrumbs">
        <Link className="text-link" to="/projects">
          <ArrowLeft size={16} />
          Back to selected work
        </Link>
      </div>
      <PageIntro label="Project overview" title={project.title} />
      <section className="container project-detail">
        <ProjectVisual project={project} index={index} />
        <div className="detail-grid">
          <div>
            <p className="eyebrow">The work</p>
            <h2>Under the surface.</h2>
            <Markdown>{project.bodyText}</Markdown>
            {project.rebuildNote && (
              <p className="rebuild-note">{project.rebuildNote}</p>
            )}
          </div>
          <aside>
            <p className="eyebrow">Built with</p>
            <div className="tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            {project.links.length > 0 && (
              <>
                <p className="eyebrow detail-link-heading">
                  Explore the project
                </p>
                {project.links.map((link) => (
                  <a
                    className="button"
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    key={link.href}
                  >
                    {link.text === "Live"
                      ? "Project website (unverified)"
                      : link.text === "Mobile"
                        ? "View mobile app"
                        : link.text}
                    <ArrowUpRight size={16} />
                  </a>
                ))}
              </>
            )}
          </aside>
        </div>
        <ProjectRelease project={project} />
        <div className="next-project">
          <span className="eyebrow">Up next</span>
          <Link
            to={
              "/projects/" +
              projectSlug(data.projects[(index + 1) % data.projects.length])
            }
          >
            {data.projects[(index + 1) % data.projects.length].title}
            <ArrowUpRight />
          </Link>
        </div>
      </section>
      <ContactBanner />
    </>
  );
}
