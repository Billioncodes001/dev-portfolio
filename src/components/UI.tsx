import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Code2,
  Github,
  Linkedin,
  Mail,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Project } from "../../shared/schema";
import { usePortfolio } from "../hooks/usePortfolio";
import { projectSlug } from "../../shared/paths";
import { releaseLabels } from "../../shared/releases";

export { projectSlug };
export const assetUrl = (value: string) => "/" + value.replace(/^\//, "");
export const projectName = (project: Project) =>
  project.title.split(" - ")[0].replace(" LTD", "").replace(" Ltd", "");
export const projectSummary = (project: Project) =>
  project.bodyText
    .split("\n")[0]
    .replace(/^-\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^a /, "A ");

export function PageIntro({
  label,
  title,
  accent,
  children,
}: {
  label: string;
  title: string;
  accent?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro container">
      <p className="eyebrow">
        <span className="tiny-dot" />
        {label}
      </p>
      <h1>
        {title} {accent && <em>{accent}</em>}
      </h1>
      {children && <div className="intro-description">{children}</div>}
    </header>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export function ProjectVisual({
  project,
  index = 0,
}: {
  project: Project;
  index?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={"project-visual visual-" + (index % 4)}>
      <div className="visual-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")} /{" "}
        {project.source === "github" ? "GITHUB REPOSITORY" : "SELECTED WORK"}
      </div>
      {project.image && !failed ? (
        <div className="browser-frame">
          <div className="browser-bar" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{projectName(project).toLowerCase()}</span>
          </div>
          <picture>
            <source
              srcSet={assetUrl(project.image).replace(/\.png$/, ".webp")}
              type="image/webp"
            />
            <img
              src={assetUrl(project.image)}
              alt={projectName(project) + " interface preview"}
              loading="lazy"
              width="900"
              height="600"
              onError={() => setFailed(true)}
            />
          </picture>
        </div>
      ) : (
        <div className="project-placeholder">
          <Code2 size={48} strokeWidth={1} />
          <span>{projectName(project)}</span>
        </div>
      )}
      <span className="visual-arrow" aria-hidden="true">
        <ArrowUpRight size={24} />
      </span>
    </div>
  );
}

export function ProjectCard({
  project,
  index = 0,
}: {
  project: Project;
  index?: number;
}) {
  return (
    <article className="project-card">
      <Link
        className="project-cover-link"
        to={"/projects/" + projectSlug(project)}
        aria-label={"Explore " + projectName(project)}
      >
        <ProjectVisual project={project} index={index} />
      </Link>
      <div className="project-card-details">
        <div>
          <p className="eyebrow project-category">
            {project.tags.slice(0, 2).join(" / ") || "Software development"}
          </p>
          <h3>
            <Link to={"/projects/" + projectSlug(project)}>
              {projectName(project)}
            </Link>
          </h3>
          <p>{projectSummary(project)}</p>
          <div className="release-badge">
            <span className="tiny-dot" aria-hidden="true" />
            {project.release
              ? releaseLabels[project.release.stage]
              : "Release not reviewed"}
          </div>
        </div>
        <Link
          className="round-link"
          to={"/projects/" + projectSlug(project)}
          aria-label={"View " + projectName(project) + " details"}
        >
          <ArrowUpRight size={21} />
        </Link>
      </div>
    </article>
  );
}

export function ContactBanner() {
  return (
    <section className="contact-banner container">
      <div>
        <p className="eyebrow">
          <span className="tiny-dot" />
          Good things start with a conversation
        </p>
        <h2>
          Have something
          <br />
          <em>in mind?</em>
        </h2>
      </div>
      <div className="contact-banner-action">
        <p>
          A product to build. A problem to solve.
          <br />
          Or just a hello. I'd love to hear it.
        </p>
        <Link className="button primary" to="/contact">
          Let's make it happen <ArrowUpRight size={18} />
        </Link>
      </div>
      <span className="banner-star" aria-hidden="true">
        ✳
      </span>
    </section>
  );
}

export function SocialLinks() {
  const data = usePortfolio();
  return (
    <div className="social-links">
      {data.social.map((item) => {
        const Icon =
          item.network === "github"
            ? Github
            : item.network === "linkedin"
              ? Linkedin
              : Mail;
        return (
          <a
            key={item.network}
            href={item.href}
            target={item.network === "email" ? undefined : "_blank"}
            rel="noreferrer"
            aria-label={item.network}
          >
            <Icon size={18} />
          </a>
        );
      })}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="site-footer container">
      <div className="footer-top">
        <Link className="brand-mark" to="/" aria-label="Back to home">
          ja<span>.</span>
        </Link>
        <p>
          Built with intention.
          <br />
          <span>Always a work in progress.</span>
        </p>
        <div className="footer-links">
          <Link to="/skills">Toolkit</Link>
          <Link to="/education">Education</Link>
          <Link to="/blog">Writing</Link>
          <Link to="/achievements">Recognition</Link>
          <Link to="/testimonials">Kind words</Link>
        </div>
        <a className="back-top" href="#top" aria-label="Back to top">
          <ArrowRight size={20} />
        </a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Josiah Adeyemo</span>
        <span>Thoughtfully built, from interface to infrastructure.</span>
      </div>
    </footer>
  );
}
