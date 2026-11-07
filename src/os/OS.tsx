import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Github,
  Linkedin,
  Lock,
  Mail,
  Maximize2,
  Minus,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import {
  assetUrl,
  projectName,
  projectSlug,
  projectSummary,
} from "../components/UI";
import { pageTitles } from "../../shared/paths";
import { apps, appForPath, desktopApps, dockApps, type AppId } from "./apps";
import RouteView from "./RouteView";
import Terminal from "./Terminal";
import Wallpaper from "./Wallpaper";
import "./os.css";

export type Theme = "light" | "dark";
export type Phase = "boot" | "lock" | "desktop";

type Win = {
  key: AppId;
  path?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
  max: boolean;
  closing: boolean;
};

const MENU = 30;
const DOCK = 92;
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useNarrow() {
  const query = "(max-width: 760px)";
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Experience entries aren't stored in date order; prefer the one still running. */
const currentRole = <T extends { dateText: string }>(items: T[]) =>
  items.find((item) => /present/i.test(item.dateText)) ?? items[0];

const time = (date: Date) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const day = (date: Date) =>
  date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export function AppIcon({ id, size = 54 }: { id: AppId; size?: number }) {
  const app = apps[id];
  const Icon = app.icon;
  return (
    <span
      className="app-icon"
      style={{
        width: size,
        height: size,
        background: app.tint[0],
        color: app.tint[1],
      }}
      aria-hidden="true"
    >
      <Icon size={size * 0.46} strokeWidth={1.8} />
    </span>
  );
}

/* ------------------------------------------------------------------ Boot */

const bootLines = [
  "JA/OS 2.0 · Lagos build",
  "mounting /home/josiah",
  "indexing projects and repositories",
  "starting window server",
  "connecting to github.com/billioncodes001",
  "warming up the coffee machine",
  "ready.",
];

export function Boot({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(reducedMotion() ? bootLines.length : 1);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const finish = () => done.current();
    if (shown >= bootLines.length) {
      const timer = setTimeout(finish, reducedMotion() ? 150 : 420);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setShown((n) => n + 1), 190);
    return () => clearTimeout(timer);
  }, [shown]);
  useEffect(() => {
    const skip = () => done.current();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, []);
  return (
    <div
      className="os-boot"
      role="status"
      aria-label="Starting JA/OS"
      onClick={() => done.current()}
    >
      <div className="os-boot-inner">
        <div className="os-boot-mark">
          ja<span>.</span>
        </div>
        <ol>
          {bootLines.slice(0, shown).map((text, index) => (
            <li key={text}>
              <span className={index === bootLines.length - 1 ? "ready" : ""}>
                {index === 0
                  ? "›"
                  : index === bootLines.length - 1
                    ? "●"
                    : "ok"}
              </span>
              {text}
            </li>
          ))}
        </ol>
        <div className="os-boot-bar">
          <i style={{ width: (shown / bootLines.length) * 100 + "%" }} />
        </div>
        <p className="os-boot-skip">Click or press any key to skip</p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Lock screen */

function LockScreen({
  onUnlock,
}: {
  onUnlock: (path?: string, app?: AppId) => void;
}) {
  const data = usePortfolio();
  const now = useClock();
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const latest = data.projects[0];
  const role = currentRole(data.experiences);
  const lead = data.leadership[0];

  const unlock = useCallback(
    (path?: string, app?: AppId) => {
      setLeaving(true);
      setTimeout(() => onUnlock(path, app), reducedMotion() ? 0 : 420);
    },
    [onUnlock],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (["Enter", " ", "ArrowUp"].includes(event.key)) {
        if ((event.target as HTMLElement).closest("button")) return;
        event.preventDefault();
        unlock();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [unlock]);

  const notes: {
    app: AppId;
    title: string;
    when: string;
    body: string;
    path?: string;
  }[] = [
    {
      app: "contact",
      title: "Leave Josiah a note ✍️",
      when: "now",
      body: "Tap to say hello. It goes straight to his inbox.",
      path: "/contact",
    },
  ];
  if (latest)
    notes.push({
      app: "work",
      title: "Work · " + projectName(latest),
      when: "pinned",
      body: projectSummary(latest),
      path: "/projects/" + projectSlug(latest),
    });
  if (lead)
    notes.push({
      app: "about",
      title: lead.title,
      when: lead.period,
      body: lead.organization,
      path: "/about",
    });
  if (role)
    notes.push({
      app: "experience",
      title: role.title,
      when: /present/i.test(role.dateText) ? "current" : role.dateText,
      body: role.subtitle,
      path: "/experience",
    });
  if (data.github && data.github.repositories > 0)
    notes.push({
      app: "terminal",
      title: "GitHub sync",
      when: data.github.status === "live" ? "live" : "cached",
      body: `${data.github.repositories} public repositories from @${data.github.username}. Type "ls projects" in Terminal.`,
    });

  return (
    <div
      className={"os-lock" + (leaving ? " is-leaving" : "")}
      style={drag ? { transform: `translateY(${-drag}px)` } : undefined}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        start.current = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current === null) return;
        setDrag(Math.max(0, start.current - event.clientY));
      }}
      onPointerUp={() => {
        if (start.current === null) return;
        start.current = null;
        if (drag > 110) unlock();
        setDrag(0);
      }}
    >
      <Wallpaper />
      <div className="os-lock-photo" aria-hidden="true">
        <img src={assetUrl(data.about.imageSource)} alt="" />
      </div>
      <header className="os-lock-clock">
        <p>{day(now)}</p>
        <h1 aria-label={"The time is " + time(now)}>{time(now)}</h1>
        <p className="os-lock-hello">
          {greeting}. You've reached <strong>{data.home.name}</strong>.
        </p>
      </header>
      <ul className="os-notes" aria-label="Notifications">
        {notes.map((note, index) => (
          <li
            key={note.title}
            style={{ animationDelay: 120 + index * 110 + "ms" }}
          >
            <button type="button" onClick={() => unlock(note.path, note.app)}>
              <AppIcon id={note.app} size={38} />
              <span className="os-note-text">
                <span className="os-note-head">
                  <b>{note.title}</b>
                  <time>{note.when}</time>
                </span>
                <span>{note.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="os-unlock" onClick={() => unlock()}>
        <span className="os-unlock-bar" aria-hidden="true" />
        Swipe up or press Enter to unlock
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- Windows */

function OsWindow({
  win,
  title,
  active,
  narrow,
  bounds,
  onFocus,
  onClose,
  onMin,
  onMax,
  onCommit,
  children,
}: {
  win: Win;
  title: string;
  active: boolean;
  narrow: boolean;
  bounds: { w: number; h: number };
  onFocus: () => void;
  onClose: () => void;
  onMin: () => void;
  onMax: () => void;
  onCommit: (rect: Partial<Win>) => void;
  children: ReactNode;
}) {
  const node = useRef<HTMLElement>(null);
  const gesture = useRef<{
    mode: "move" | "size";
    px: number;
    py: number;
    rect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const begin = (mode: "move" | "size") => (event: ReactPointerEvent) => {
    if (narrow || win.max || event.button !== 0) return;
    if (mode === "move" && (event.target as HTMLElement).closest("button"))
      return;
    event.preventDefault();
    onFocus();
    gesture.current = {
      mode,
      px: event.clientX,
      py: event.clientY,
      rect: { x: win.x, y: win.y, w: win.w, h: win.h },
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    node.current?.classList.add("is-dragging");
  };
  const move = (event: ReactPointerEvent) => {
    const g = gesture.current;
    const el = node.current;
    if (!g || !el) return;
    const dx = event.clientX - g.px;
    const dy = event.clientY - g.py;
    if (g.mode === "move") {
      const x = Math.min(Math.max(g.rect.x + dx, 80 - g.rect.w), bounds.w - 80);
      const y = Math.min(Math.max(g.rect.y + dy, MENU), bounds.h - 60);
      el.style.left = x + "px";
      el.style.top = y + "px";
    } else {
      el.style.width = Math.max(380, g.rect.w + dx) + "px";
      el.style.height = Math.max(260, g.rect.h + dy) + "px";
    }
  };
  const end = () => {
    const el = node.current;
    if (!gesture.current || !el) return;
    gesture.current = null;
    el.classList.remove("is-dragging");
    onCommit({
      x: parseFloat(el.style.left),
      y: parseFloat(el.style.top),
      w: parseFloat(el.style.width),
      h: parseFloat(el.style.height),
    });
  };

  return (
    <section
      ref={node}
      className={
        "os-window" +
        (active ? " is-active" : "") +
        (win.max ? " is-max" : "") +
        (win.min ? " is-min" : "") +
        (win.closing ? " is-closing" : "") +
        (win.key === "terminal" ? " is-terminal" : "")
      }
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
      }}
      aria-label={title}
      aria-hidden={win.min || undefined}
      onPointerDownCapture={onFocus}
    >
      <header
        className="os-titlebar"
        onPointerDown={begin("move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest("button")) onMax();
        }}
      >
        {narrow ? (
          <button type="button" className="os-back" onClick={onMin}>
            <ChevronLeft size={18} /> Home
          </button>
        ) : (
          <span className="os-title-app">
            <AppIcon id={win.key} size={18} />
          </span>
        )}
        <h2>{title}</h2>
        <div className="os-controls">
          {!narrow && (
            <>
              <button
                type="button"
                onClick={onMin}
                aria-label={"Minimise " + title}
              >
                <Minus size={13} />
              </button>
              <button
                type="button"
                onClick={onMax}
                aria-label={(win.max ? "Restore " : "Maximise ") + title}
              >
                <Maximize2 size={12} />
              </button>
            </>
          )}
          <button
            type="button"
            className="os-close"
            onClick={onClose}
            aria-label={"Close " + title}
          >
            <X size={14} />
          </button>
        </div>
      </header>
      <div className="os-window-body" tabIndex={-1}>
        {children}
      </div>
      {!narrow && !win.max && (
        <span
          className="os-resize"
          aria-hidden="true"
          onPointerDown={begin("size")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </section>
  );
}

/* -------------------------------------------------------------- Launcher */

type Hit = {
  id: string;
  label: string;
  hint: string;
  app: AppId;
  go: () => void;
};

function Launcher({
  hits,
  onClose,
}: {
  hits: (q: string) => Hit[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = hits(query);
  const pick = (hit?: Hit) => {
    if (!hit) return;
    onClose();
    hit.go();
  };
  return (
    <div className="os-launcher-scrim" onPointerDown={onClose}>
      <div
        className="os-launcher"
        role="dialog"
        aria-label="Search JA/OS"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="os-launcher-field">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            placeholder="Search apps and projects…"
            aria-label="Search apps and projects"
            role="combobox"
            aria-expanded="true"
            aria-controls="os-launcher-results"
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              else if (event.key === "ArrowDown") {
                event.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (event.key === "Enter") pick(results[index]);
            }}
          />
          <kbd>esc</kbd>
        </div>
        <ul id="os-launcher-results" role="listbox">
          {results.map((hit, i) => (
            <li key={hit.id} role="option" aria-selected={i === index}>
              <button
                type="button"
                className={i === index ? "is-on" : ""}
                onPointerEnter={() => setIndex(i)}
                onClick={() => pick(hit)}
              >
                <AppIcon id={hit.app} size={30} />
                <span>
                  <b>{hit.label}</b>
                  <i>{hit.hint}</i>
                </span>
              </button>
            </li>
          ))}
          {!results.length && (
            <li className="os-launcher-empty">Nothing matches "{query}".</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Desktop */

export default function OS({
  phase,
  setPhase,
  theme,
  setTheme,
}: {
  phase: Phase;
  setPhase: (phase: Phase) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  const data = usePortfolio();
  const location = useLocation();
  const navigate = useNavigate();
  const narrow = useNarrow();
  const now = useClock();
  const [wins, setWins] = useState<Win[]>([]);
  const [launcher, setLauncher] = useState(false);
  const [menu, setMenu] = useState(false);
  const zTop = useRef(20);
  const [bounds, setBounds] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  useEffect(() => {
    const resize = () =>
      setBounds({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const place = useCallback(
    (key: AppId, count: number): Pick<Win, "x" | "y" | "w" | "h"> => {
      const small = key === "terminal";
      // Wide screens keep the widget column (left) and icon column (right) clear.
      const left = bounds.w >= 1180 ? 292 : 16;
      const right = bounds.w >= 1180 ? 130 : 16;
      const room = bounds.w - left - right;
      const step = (count % 5) * 28;
      const w = Math.min(small ? 700 : 1100, room - 40 - step);
      const y = MENU + 18 + step;
      const h = Math.min(small ? 460 : 780, bounds.h - DOCK - 16 - y);
      return {
        x: left + Math.max(0, Math.round((room - 40 - step - w) / 2)) + step,
        y,
        w,
        h,
      };
    },
    [bounds.w, bounds.h],
  );

  const ensure = useCallback(
    (key: AppId, path?: string) => {
      zTop.current += 1;
      const z = zTop.current;
      setWins((list) => {
        const found = list.find((w) => w.key === key);
        if (found)
          return list.map((w) =>
            w.key === key
              ? { ...w, path: path ?? w.path, z, min: false, closing: false }
              : w,
          );
        const open = list.filter((w) => !w.closing).length;
        return [
          ...list,
          {
            key,
            path,
            z,
            min: false,
            max: false,
            closing: false,
            ...place(key, open),
          },
        ];
      });
    },
    [place],
  );

  // The URL decides which page window is in front, so links, deep links and
  // the back button all keep working inside the desktop.
  useEffect(() => {
    if (phase !== "desktop") return;
    const state = location.state as { desktop?: boolean } | null;
    if (location.pathname === "/" && state?.desktop) return;
    const key = appForPath(location.pathname) ?? "welcome";
    // Keep the hash so in-page anchors such as /about#leadership still land.
    ensure(key, location.pathname + location.hash);
  }, [location.pathname, location.hash, location.state, phase, ensure]);

  const visible = wins.filter((w) => !w.min && !w.closing);
  const top = visible.reduce<Win | null>(
    (a, w) => (!a || w.z > a.z ? w : a),
    null,
  );

  const focus = (win: Win) => {
    if (top?.key === win.key) return;
    zTop.current += 1;
    const z = zTop.current;
    setWins((list) => list.map((w) => (w.key === win.key ? { ...w, z } : w)));
    if (win.path && win.path !== location.pathname + location.hash)
      navigate(win.path, { replace: true });
  };
  const leaveUrl = (gone: AppId) => {
    const rest = visible
      .filter((w) => w.key !== gone && w.path)
      .sort((a, b) => b.z - a.z);
    if (rest[0]?.path) navigate(rest[0].path, { replace: true });
    else navigate("/", { replace: true, state: { desktop: true } });
  };
  const close = (win: Win) => {
    setWins((list) =>
      list.map((w) => (w.key === win.key ? { ...w, closing: true } : w)),
    );
    setTimeout(
      () =>
        setWins((list) =>
          list.filter((w) => !(w.key === win.key && w.closing)),
        ),
      reducedMotion() ? 0 : 180,
    );
    if (win.path) leaveUrl(win.key);
  };
  const minimise = (win: Win) => {
    setWins((list) =>
      list.map((w) => (w.key === win.key ? { ...w, min: true } : w)),
    );
    if (win.path) leaveUrl(win.key);
  };
  const maximise = (win: Win) =>
    setWins((list) =>
      list.map((w) => (w.key === win.key ? { ...w, max: !w.max } : w)),
    );
  const openApp = useCallback(
    (key: AppId) => {
      const path = apps[key].path;
      if (path) navigate(path);
      else ensure(key);
    },
    [navigate, ensure],
  );
  const openPath = useCallback((path: string) => navigate(path), [navigate]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLauncher((v) => !v);
      } else if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const titleFor = (win: Win) => {
    if (win.key === "project") {
      const slug = win.path?.split("#")[0].split("/")[2];
      const project = data.projects.find((p) => projectSlug(p) === slug);
      return project ? projectName(project) : "Project";
    }
    if (win.key === "welcome" && win.path && win.path !== "/")
      return pageTitles[win.path] ?? "Not found";
    return apps[win.key].title;
  };

  const hits = useMemo(() => {
    const all: Hit[] = [
      ...Object.values(apps)
        .filter((app) => app.id !== "project")
        .map((app) => ({
          id: "app-" + app.id,
          label: app.title,
          hint: app.blurb,
          app: app.id,
          go: () => openApp(app.id),
        })),
      ...data.projects.map((project) => ({
        id: "project-" + projectSlug(project),
        label: projectName(project),
        hint: projectSummary(project),
        app: "project" as AppId,
        go: () => openPath("/projects/" + projectSlug(project)),
      })),
    ];
    return (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return all.slice(0, 9);
      return all
        .filter((hit) => (hit.label + " " + hit.hint).toLowerCase().includes(q))
        .slice(0, 9);
    };
  }, [data.projects, openApp, openPath]);

  const socials = data.social.map((item) => ({
    ...item,
    Icon:
      item.network === "github"
        ? Github
        : item.network === "linkedin"
          ? Linkedin
          : Mail,
  }));

  if (phase === "lock")
    return (
      <LockScreen
        onUnlock={(path, app) => {
          setPhase("desktop");
          if (path) navigate(path);
          else if (app) {
            navigate("/", { replace: true, state: { desktop: true } });
            ensure(app);
          }
        }}
      />
    );

  const role = currentRole(data.experiences);
  const homeVisible = narrow && !top;

  return (
    <div
      className={
        "os" + (narrow ? " is-narrow" : "") + (homeVisible ? " show-home" : "")
      }
    >
      <Wallpaper />

      <header className="os-menubar">
        <div className="os-menubar-left">
          <div className="os-menu-wrap">
            <button
              type="button"
              className="os-logo"
              aria-expanded={menu}
              aria-haspopup="menu"
              onClick={() => setMenu((v) => !v)}
            >
              ja<span>.</span>
            </button>
            {menu && (
              <div
                className="os-menu"
                role="menu"
                onClick={() => setMenu(false)}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openApp("about")}
                >
                  About Josiah
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openApp("contact")}
                >
                  Send a message…
                </button>
                {data.resume && (
                  <a
                    role="menuitem"
                    href={data.resume}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download résumé
                  </a>
                )}
                <hr />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                  {theme === "light" ? "Dark" : "Light"} windows
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setPhase("lock")}
                >
                  Lock screen
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setPhase("boot")}
                >
                  Restart…
                </button>
              </div>
            )}
          </div>
          <strong className="os-menubar-app">
            {top ? titleFor(top) : "Desktop"}
          </strong>
          {!narrow && (
            <nav className="os-menubar-links" aria-label="Main navigation">
              <Link to="/projects">Work</Link>
              <Link to="/about">About</Link>
              <Link to="/experience">Experience</Link>
              <Link to="/contact">Contact</Link>
            </nav>
          )}
        </div>
        <div className="os-menubar-right">
          {!narrow && (
            <span className="os-status">
              <i /> Open to new work
            </span>
          )}
          <button
            type="button"
            className="os-icon-btn"
            onClick={() => setLauncher(true)}
            aria-label="Search (Ctrl or Command K)"
          >
            <Search size={15} />
          </button>
          <button
            type="button"
            className="os-icon-btn"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={
              "Switch to " + (theme === "light" ? "dark" : "light") + " theme"
            }
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button
            type="button"
            className="os-icon-btn"
            onClick={() => setPhase("lock")}
            aria-label="Lock screen"
          >
            <Lock size={14} />
          </button>
          <time className="os-clock">
            {!narrow &&
              now.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
              }) + "  "}
            {time(now)}
          </time>
        </div>
      </header>

      {/* Desktop layer: icons and widgets on wide screens, a home screen on phones. */}
      <div className="os-desk">
        <aside className="os-widgets" aria-label="Status">
          <div className="os-widget os-widget-hello">
            <img src={assetUrl(data.about.imageSource)} alt="" />
            <div>
              <b>{data.home.name}</b>
              <span>{data.home.roles[0]?.replace(/^an? /, "")}</span>
            </div>
          </div>
          {role && (
            <button
              type="button"
              className="os-widget"
              onClick={() => openApp("experience")}
            >
              <small>Currently</small>
              <b>{role.title}</b>
              <span>{role.subtitle}</span>
            </button>
          )}
          <div className="os-widget os-widget-tip">
            <small>Tip</small>
            <span>
              Press{" "}
              <kbd>{navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}</kbd>{" "}
              <kbd>K</kbd> to search, or open <b>Terminal</b> and type{" "}
              <code>help</code>.
            </span>
          </div>
        </aside>

        <ul className="os-icons" aria-label="Apps">
          {(narrow
            ? [...dockApps.filter((id) => id !== "welcome"), ...desktopApps]
            : desktopApps
          ).map((id) => (
            <li key={id}>
              <button type="button" onClick={() => openApp(id)}>
                <AppIcon id={id} size={narrow ? 58 : 50} />
                <span>{apps[id].title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <main className="os-windows" id="main-content" tabIndex={-1}>
        {wins.map((win) => (
          <OsWindow
            key={win.key}
            win={win}
            title={titleFor(win)}
            active={top?.key === win.key}
            narrow={narrow}
            bounds={bounds}
            onFocus={() => focus(win)}
            onClose={() => close(win)}
            onMin={() => minimise(win)}
            onMax={() => maximise(win)}
            onCommit={(rect) =>
              setWins((list) =>
                list.map((w) => (w.key === win.key ? { ...w, ...rect } : w)),
              )
            }
          >
            {win.key === "terminal" ? (
              <Terminal
                open={openPath}
                openApp={openApp}
                setTheme={setTheme}
                close={() => close(win)}
              />
            ) : (
              <div className="os-page">
                <RouteView path={win.path ?? "/"} />
              </div>
            )}
          </OsWindow>
        ))}
      </main>

      <nav className="os-dock" aria-label="Dock">
        {(narrow
          ? (["welcome", "work", "terminal", "contact"] as AppId[])
          : dockApps
        ).map((id) => {
          const running = wins.some((w) => w.key === id && !w.closing);
          return (
            <button
              type="button"
              key={id}
              className={"os-dock-item" + (running ? " is-running" : "")}
              onClick={() => {
                const win = wins.find((w) => w.key === id && !w.closing);
                if (win && !win.min && top?.key === id && !narrow)
                  minimise(win);
                else openApp(id);
              }}
              aria-label={apps[id].title + (running ? " (open)" : "")}
            >
              <AppIcon id={id} size={narrow ? 50 : 46} />
              <span className="os-dock-tip">{apps[id].title}</span>
            </button>
          );
        })}
        {!narrow && <span className="os-dock-sep" aria-hidden="true" />}
        {!narrow &&
          socials.map(({ network, href, Icon }) => (
            <a
              key={network}
              className="os-dock-item"
              href={href}
              target={href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              aria-label={network}
            >
              <span className="app-icon app-icon-social" aria-hidden="true">
                <Icon size={21} />
              </span>
              <span className="os-dock-tip">{network}</span>
            </a>
          ))}
      </nav>

      {launcher && <Launcher hits={hits} onClose={() => setLauncher(false)} />}
    </div>
  );
}
