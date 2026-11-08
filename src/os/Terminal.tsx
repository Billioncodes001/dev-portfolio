import { unlock } from "./secrets";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import { projectName, projectSlug, projectSummary } from "../components/UI";
import { apps, type AppId } from "./apps";
import type { Project } from "../../shared/schema";

type Line = { id: number; kind: "in" | "out" | "err"; body: ReactNode };

type Props = {
  open: (path: string) => void;
  openApp: (id: AppId) => void;
  setTheme: (theme: "light" | "dark") => void;
  close: () => void;
};

const commands = [
  "help",
  "whoami",
  "about",
  "ls",
  "projects",
  "open",
  "experience",
  "skills",
  "socials",
  "contact",
  "neofetch",
  "theme",
  "date",
  "echo",
  "history",
  "clear",
  "exit",
];

const openable = Object.values(apps)
  .filter((app) => app.id !== "project" && app.id !== "sysinfo")
  .map((app) => app.title.toLowerCase().replace(/\s+/g, "-"));

/** A typeable name: repo name for GitHub projects, otherwise the page slug. */
const handle = (project: Project) =>
  project.repository
    ? project.repository.name.toLowerCase()
    : projectSlug(project);

let nextId = 0;
const line = (kind: Line["kind"], body: ReactNode): Line => ({
  id: nextId++,
  kind,
  body,
});

export default function Terminal({ open, openApp, setTheme, close }: Props) {
  const data = usePortfolio();
  const [lines, setLines] = useState<Line[]>(() => [
    line(
      "out",
      <>
        JA/OS shell. Type <b>help</b> to see what I can do, or{" "}
        <b>ls projects</b> to look around.
      </>,
    ),
  ]);
  const [value, setValue] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  const findProject = (query: string) =>
    data.projects.find(
      (project) =>
        handle(project) === query ||
        projectSlug(project) === query ||
        projectName(project).toLowerCase() === query,
    );

  const run = (raw: string): ReactNode | null => {
    const [name = "", ...args] = raw.trim().split(/\s+/);
    const arg = args.join(" ").toLowerCase();
    switch (name.toLowerCase()) {
      case "":
        return null;
      case "help":
        return (
          <div className="term-grid">
            {[
              ["whoami", "who runs this machine"],
              ["about", "a short biography"],
              ["ls [projects|apps]", "list what's here"],
              ["open <app|project>", "open a window"],
              ["experience", "roles at a glance"],
              ["skills", "the toolkit"],
              ["socials", "where to find me"],
              ["contact", "write me a message"],
              ["neofetch", "system info, but make it personal"],
              ["theme <light|dark>", "change the window theme"],
              ["clear / exit", "tidy up or close the terminal"],
            ].map(([cmd, text]) => (
              <span key={cmd}>
                <b>{cmd}</b>
                <i>{text}</i>
              </span>
            ))}
          </div>
        );
      case "whoami":
        return `${data.home.name}: ${data.home.roles.join(", ").replace(/\ba /g, "")}.`;
      case "about":
        return data.about.about.split("\n").find((p) => p.trim()) ?? "";
      case "ls":
        if (arg === "apps")
          return (
            <div className="term-cols">
              {openable.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          );
        return (
          <div className="term-list">
            {data.projects.map((project) => (
              <button
                type="button"
                key={projectSlug(project)}
                onClick={() => open("/projects/" + projectSlug(project))}
              >
                <b>{handle(project)}</b>
                <i>{projectSummary(project)}</i>
              </button>
            ))}
            <span className="term-dim">
              {data.projects.length} projects. Try: open{" "}
              {handle(data.projects[0])}
            </span>
          </div>
        );
      case "projects":
        open("/projects");
        return "Opening Work…";
      case "open": {
        if (!arg) return "Usage: open <app|project>. Try ls apps.";
        const app = Object.values(apps).find(
          (item) =>
            item.id !== "project" &&
            (item.id === arg ||
              item.title.toLowerCase().replace(/\s+/g, "-") === arg ||
              item.title.toLowerCase() === arg),
        );
        if (app) {
          openApp(app.id);
          return `Opening ${app.title}…`;
        }
        const project = findProject(arg);
        if (project) {
          open("/projects/" + projectSlug(project));
          return `Opening ${projectName(project)}…`;
        }
        throw new Error(
          `open: nothing called "${arg}". Try ls apps or ls projects.`,
        );
      }
      case "experience":
        return (
          <div className="term-list">
            {data.experiences.map((item) => (
              <span key={item.title + item.dateText}>
                <b>{item.title}</b>
                <i>
                  {item.subtitle} · {item.dateText}
                </i>
              </span>
            ))}
          </div>
        );
      case "skills":
        return (
          <div className="term-list">
            {data.skills.map((group) => (
              <span key={group.title}>
                <b>{group.title}</b>
                <i>{group.items.map((item) => item.title).join(", ")}</i>
              </span>
            ))}
          </div>
        );
      case "socials":
        return (
          <div className="term-list">
            {data.social.map((item) => (
              <a
                key={item.network}
                href={item.href}
                target={item.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noreferrer"
              >
                <b>{item.network}</b>
                <i>{item.href.replace(/^mailto:|^https?:\/\//, "")}</i>
              </a>
            ))}
          </div>
        );
      case "contact":
      case "mail":
        open("/contact");
        return "Opening Mail. Say hello!";
      case "neofetch":
        return (
          <div className="term-fetch">
            <pre aria-hidden="true">{`   _       \n  (_) __ _ \n  | |/ _\` |\n  | | (_| |\n _/ |\\__,_|\n|__/   .   `}</pre>
            <div>
              <b>josiah@ja-os</b>
              <span>
                <i>OS</i> JA/OS 2.0 (Lagos build)
              </span>
              <span>
                <i>Host</i> josiahadeyemo.me
              </span>
              <span>
                <i>Roles</i>{" "}
                {data.home.roles.map((r) => r.replace(/^an? /, "")).join(" · ")}
              </span>
              <span>
                <i>Projects</i> {data.projects.length}
              </span>
              <span>
                <i>Shell</i> ja-sh, typed with care
              </span>
              <span>
                <i>Uptime</i> since the first "hello, world"
              </span>
              <span className="term-swatches" aria-hidden="true">
                {["#252a24", "#2f5d3a", "#688242", "#d7ed91", "#f6f5f0"].map(
                  (c) => (
                    <i key={c} style={{ background: c }} />
                  ),
                )}
              </span>
            </div>
          </div>
        );
      case "theme":
        if (arg !== "light" && arg !== "dark")
          return "Usage: theme light | theme dark";
        setTheme(arg);
        return `Windows switched to ${arg}.`;
      case "date":
        return new Date().toString();
      case "echo":
        return args.join(" ");
      case "history":
        return past.length ? past.join("\n") : "Nothing yet.";
      case "sudo":
        unlock("sudo");
        return "🏆 Secret found. Also: Permission denied. Nice try, though. I'll take it as a compliment.";
      case "rm":
        return "rm: this portfolio is read-only. Everything here stays.";
      case "clear":
        setLines([]);
        return null;
      case "exit":
        close();
        return null;
      default:
        throw new Error(`${name}: command not found. Type help.`);
    }
  };

  const submit = () => {
    const raw = value;
    setValue("");
    setCursor(-1);
    if (raw.trim()) setPast((items) => [...items, raw]);
    const echo = line("in", raw);
    let result: Line | null = null;
    try {
      const output = run(raw);
      if (output !== null) result = line("out", output);
    } catch (error) {
      result = line("err", (error as Error).message);
    }
    if (raw.trim().toLowerCase() === "clear") return;
    setLines((items) => [...items, echo, ...(result ? [result] : [])]);
  };

  const complete = () => {
    const parts = value.split(" ");
    const pool =
      parts.length === 1
        ? commands
        : parts[0] === "open"
          ? [...openable, ...data.projects.map(handle)]
          : parts[0] === "ls"
            ? ["projects", "apps"]
            : parts[0] === "theme"
              ? ["light", "dark"]
              : [];
    const word = parts[parts.length - 1].toLowerCase();
    const hits = pool.filter((item) => item.startsWith(word));
    if (hits.length === 1) {
      parts[parts.length - 1] = hits[0];
      setValue(parts.join(" ") + " ");
    } else if (hits.length > 1)
      setLines((items) => [
        ...items,
        line("in", value),
        line("out", hits.join("  ")),
      ]);
  };

  return (
    <div className="terminal" onClick={() => input.current?.focus()}>
      <div className="terminal-scroll" ref={scroller} aria-live="polite">
        {lines.map((item) =>
          item.kind === "in" ? (
            <div className="term-line" key={item.id}>
              <span className="term-prompt" aria-hidden="true">
                josiah@ja-os ~ %
              </span>{" "}
              {item.body}
            </div>
          ) : (
            <div
              className={"term-out" + (item.kind === "err" ? " term-err" : "")}
              key={item.id}
            >
              {item.body}
            </div>
          ),
        )}
        <form
          className="term-line term-input"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="term-input" className="term-prompt">
            josiah@ja-os ~ %
          </label>
          <input
            id="term-input"
            ref={input}
            value={value}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Terminal command"
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                event.preventDefault();
                complete();
              } else if (event.key === "ArrowUp" && past.length) {
                event.preventDefault();
                const next =
                  cursor < 0 ? past.length - 1 : Math.max(0, cursor - 1);
                setCursor(next);
                setValue(past[next]);
              } else if (event.key === "ArrowDown" && cursor >= 0) {
                event.preventDefault();
                const next = cursor + 1;
                setCursor(next >= past.length ? -1 : next);
                setValue(next >= past.length ? "" : past[next]);
              }
            }}
          />
        </form>
      </div>
    </div>
  );
}
