import { useMemo, useState } from "react";
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

/**
 * Sites that allow being framed. Everything else blocks embedding
 * (X-Frame-Options), so it opens as a screenshot page with a link out.
 * Keep in sync with frame-src in public/_headers and server/app.ts.
 */
const FRAMEABLE = ["https://osint-neural-atlas.pages.dev"];

type Tab = {
  id: string;
  title: string;
  url: string;
  live?: string;
  project?: Project;
};

const liveLink = (project: Project) =>
  project.links.find((link) => !/github\.com/.test(link.href))?.href;
const host = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** A browser whose tabs are my projects: live where possible, screenshots otherwise. */
export default function Safari({ open }: { open: (path: string) => void }) {
  const data = usePortfolio();
  const tabs = useMemo<Tab[]>(() => {
    const projects = data.projects
      .filter((p) => liveLink(p) || p.image)
      .slice(0, 12);
    return [
      { id: "start", title: "Favorites", url: "favorites://" },
      ...projects.map((project) => {
        const live = liveLink(project);
        return {
          id: projectSlug(project),
          title: projectName(project),
          url:
            live ?? "https://josiahadeyemo.me/projects/" + projectSlug(project),
          live,
          project,
        };
      }),
    ];
  }, [data.projects]);
  const firstLive = tabs.find(
    (tab) =>
      tab.live && FRAMEABLE.some((origin) => tab.live!.startsWith(origin)),
  );
  const [active, setActive] = useState(firstLive?.id ?? "start");
  const [history, setHistory] = useState<string[]>([]);
  const [reload, setReload] = useState(0);
  const tab = tabs.find((item) => item.id === active) ?? tabs[0];
  const go = (id: string) => {
    if (id === active) return;
    setHistory((items) => [...items, active]);
    setActive(id);
  };
  const framed =
    tab.live && FRAMEABLE.some((origin) => tab.live!.startsWith(origin));

  return (
    <div className="safari">
      <div className="safari-bar">
        <div className="safari-nav">
          <button
            type="button"
            aria-label="Back"
            disabled={!history.length}
            onClick={() => {
              const previous = history[history.length - 1];
              setHistory((items) => items.slice(0, -1));
              if (previous) setActive(previous);
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Forward" disabled>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="safari-address" title={tab.url}>
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
        {tab.live ? (
          <a
            className="safari-out"
            href={tab.live}
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
              Every tab is something I built. Live sites open right here when
              they allow it; the rest show a preview with a link out.
            </p>
          </div>
        ) : framed ? (
          <iframe
            key={tab.id + reload}
            src={tab.live}
            title={tab.title + " (live site)"}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
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
              <div className="safari-actions">
                {tab.live && (
                  <a href={tab.live} target="_blank" rel="noreferrer">
                    Visit the live site <ArrowUpRight size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => open("/projects/" + tab.id)}
                >
                  Read the case study
                </button>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
