import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  RotateCw,
  Star,
} from "lucide-react";
import { usePortfolio } from "../../hooks/usePortfolio";
import {
  assetUrl,
  projectName,
  projectSlug,
  projectSummary,
} from "../../components/UI";
import type { Project } from "../../../shared/schema";

type Tab = {
  id: string;
  title: string;
  /** The project's own link: its live site, or its repository if it has none. */
  url: string;
  project?: Project;
};

const isGitHub = (href: string) =>
  /^https?:\/\/(www\.)?github\.com\//.test(href);
const ownLink = (project: Project) =>
  project.links.find((link) => !isGitHub(link.href))?.href ??
  project.links[0]?.href;
const host = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/**
 * A browser whose tabs are my projects. Each tab's address is the project's
 * own link, and the site loads inside the tab when it allows that. Sites that
 * refuse to be framed (most do) are opened from a card with their real link.
 */
export default function Safari({ open }: { open: (path: string) => void }) {
  const data = usePortfolio();
  const tabs = useMemo<Tab[]>(() => {
    const projects = data.projects
      .filter((p) => p.links.length || p.image)
      .slice(0, 12);
    return [
      { id: "start", title: "Favorites", url: "" },
      ...projects.map((project) => ({
        id: projectSlug(project),
        title: projectName(project),
        url:
          ownLink(project) ??
          "https://josiahadeyemo.me/projects/" + projectSlug(project),
        project,
      })),
    ];
  }, [data.projects]);

  // Which sites allow framing, as the server read their headers. null while
  // the check is running; a failed check treats every site as blocked.
  const [embeds, setEmbeds] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/embeds")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => alive && setEmbeds(body?.embeds ?? {}))
      .catch(() => alive && setEmbeds({}));
    return () => {
      alive = false;
    };
  }, []);

  const [active, setActive] = useState("start");
  const [back, setBack] = useState<string[]>([]);
  const [forward, setForward] = useState<string[]>([]);
  const [reload, setReload] = useState(0);
  const tab = tabs.find((item) => item.id === active) ?? tabs[0];
  const framed = tab.id !== "start" && embeds?.[tab.url] === true;
  const checking = tab.id !== "start" && embeds === null;

  const go = (id: string) => {
    if (id === active) return;
    setBack((items) => [...items, active]);
    setForward([]);
    setActive(id);
  };
  const goBack = () => {
    const previous = back[back.length - 1];
    if (!previous) return;
    setBack(back.slice(0, -1));
    setForward([active, ...forward]);
    setActive(previous);
  };
  const goForward = () => {
    const next = forward[0];
    if (!next) return;
    setForward(forward.slice(1));
    setBack([...back, active]);
    setActive(next);
  };

  return (
    <div className="safari">
      <div className="safari-bar">
        <div className="safari-nav">
          <button
            type="button"
            aria-label="Back"
            disabled={!back.length}
            onClick={goBack}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Forward"
            disabled={!forward.length}
            onClick={goForward}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="safari-address" title={tab.url || "Favorites"}>
          {tab.id !== "start" && <LockKeyhole size={11} aria-hidden="true" />}
          <span>
            {tab.id === "start"
              ? "Search or enter website name"
              : host(tab.url)}
          </span>
          {tab.id !== "start" && (
            <button
              type="button"
              aria-label="Reload page"
              onClick={() => setReload((n) => n + 1)}
            >
              <RotateCw size={12} />
            </button>
          )}
        </div>
        {tab.id !== "start" ? (
          <a
            className="safari-out"
            href={tab.url}
            target="_blank"
            rel="noreferrer"
          >
            Open <ArrowUpRight size={14} />
          </a>
        ) : (
          <span className="safari-out-spacer" />
        )}
      </div>
      <div className="safari-tabs" role="tablist" aria-label="Projects">
        {tabs.map((item) => (
          <button
            type="button"
            role="tab"
            key={item.id}
            aria-selected={item.id === active}
            className={item.id === active ? "is-on" : ""}
            onClick={() => go(item.id)}
          >
            {item.id === "start" && <Star size={11} aria-hidden="true" />}
            {item.title}
          </button>
        ))}
      </div>
      <div className="safari-view" role="tabpanel" aria-label={tab.title}>
        {tab.id === "start" ? (
          <div className="safari-start">
            <h3>Favorites</h3>
            <div className="safari-favs">
              {tabs.slice(1).map((item) => (
                <button type="button" key={item.id} onClick={() => go(item.id)}>
                  <span className="safari-fav-tile">
                    {item.project?.image ? (
                      <img
                        src={assetUrl(item.project.image)}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      item.title[0]
                    )}
                  </span>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
            <p className="safari-note">
              Every tab opens one of my projects at its own address. Sites that
              allow it load right here; the rest open in their own tab.
            </p>
          </div>
        ) : framed ? (
          <iframe
            key={tab.id + reload}
            src={tab.url}
            title={tab.title + " (live site)"}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <article className="safari-page" key={tab.id + reload}>
            {tab.project?.image && (
              <img
                src={assetUrl(tab.project.image)}
                alt={tab.title + " preview"}
              />
            )}
            <div>
              <h3>{tab.title}</h3>
              <p>{tab.project && projectSummary(tab.project)}</p>
              <p className="safari-note">
                {checking
                  ? "Checking whether this site opens here…"
                  : `${host(tab.url)} doesn't allow being shown inside another page, so it opens in its own tab.`}
              </p>
              <div className="safari-actions">
                <a href={tab.url} target="_blank" rel="noreferrer">
                  Open {host(tab.url)} <ArrowUpRight size={15} />
                </a>
                {tab.project && (
                  <button
                    type="button"
                    onClick={() => open("/projects/" + tab.id)}
                  >
                    Read the case study
                  </button>
                )}
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
