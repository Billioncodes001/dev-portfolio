import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  Mail,
  Moon,
  Search,
  Sun,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { projectName, projectSlug, projectSummary } from "../components/UI";
import { pageTitles } from "../../shared/paths";
import {
  apps,
  appForPath,
  desktopApps,
  dockApps,
  homeApps,
  phoneDock,
  type AppId,
} from "./apps";
import AppIcon from "./AppIcon";
import LockScreen from "./LockScreen";
import RouteView from "./RouteView";
import Terminal from "./Terminal";
import Wallpaper from "./Wallpaper";
import Calendar from "./apps/Calendar";
import Notes from "./apps/Notes";
import Safari from "./apps/Safari";
import SysInfo from "./apps/SysInfo";
import Pocket, { CARTS, type CartId } from "./pocket/Pocket";
import Messages from "./apps/Messages";
import Secrets from "./apps/Secrets";
import Stats from "./Stats";
import { SECRETS, dismissLatest, unlock, useSecrets } from "./secrets";
import { sound, useSound } from "./sound";
import { flip, iconRect, takeLaunch, useExit, zoom } from "./motion";
import { Battery, Signal, Wifi } from "./StatusIcons";
import {
  menuDate,
  reducedMotion,
  shortTime,
  useClock,
  useNarrow,
} from "./util";
import "./os.css";

export { default as AppIcon } from "./AppIcon";
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

const MENU = 26;
const DOCK = 86;

/* ------------------------------------------------------------------ Boot */

/** A Mac-style power-on: the mark and a filling progress bar. */
export function Boot({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  const [progress, setProgress] = useState(reducedMotion() ? 100 : 4);
  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(
        () => done.current(),
        reducedMotion() ? 100 : 350,
      );
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => setProgress((p) => Math.min(100, p + 8 + Math.random() * 18)),
      110,
    );
    return () => clearTimeout(timer);
  }, [progress]);
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
      <div className="os-boot-mark" aria-hidden="true">
        ja<span>.</span>
      </div>
      <div className="os-boot-bar" aria-hidden="true">
        <i style={{ width: progress + "%" }} />
      </div>
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
    x: number;
    y: number;
    frame: number;
  } | null>(null);
  const last = useRef<DOMRect | null>(null);
  const first = useRef(true);
  const was = useRef({
    max: win.max,
    min: win.min,
    closing: win.closing,
    active,
  });

  // Opening grows the window out of the icon that launched it.
  useLayoutEffect(() => {
    const el = node.current;
    const from = takeLaunch(win.key);
    if (!el || !from) return;
    if (zoom(el, from, "in")) el.style.animation = "none";
    // Mount only: later changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Maximise, minimise and close animate with transforms only (FLIP), so the
  // page inside never relayouts mid-motion.
  useLayoutEffect(() => {
    const el = node.current;
    const before = was.current;
    was.current = { max: win.max, min: win.min, closing: win.closing, active };
    if (!el || first.current) {
      first.current = false;
      return;
    }
    if (before.max !== win.max && last.current) flip(el, last.current);
    // On phones only the app on screen animates; the rest are hidden already.
    if (
      before.min !== win.min &&
      (!narrow || (win.min ? before.active : true))
    ) {
      const icon = iconRect(win.key);
      if (icon) zoom(el, icon, win.min ? "out" : "in");
    }
    if (!before.closing && win.closing && narrow) {
      const icon = iconRect(win.key);
      if (icon && zoom(el, icon, "out")) el.style.animation = "none";
    }
  }, [win.max, win.min, win.closing, win.key, narrow, active]);
  useLayoutEffect(() => {
    if (node.current && !win.min)
      last.current = node.current.getBoundingClientRect();
  });

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
      x: win.x,
      y: win.y,
      frame: 0,
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
      // Dragging moves a composited layer; left/top are written once, on drop.
      g.x = Math.min(Math.max(g.rect.x + dx, 80 - g.rect.w), bounds.w - 80);
      g.y = Math.min(Math.max(g.rect.y + dy, MENU), bounds.h - 60);
      el.style.transform = `translate3d(${g.x - g.rect.x}px, ${g.y - g.rect.y}px, 0)`;
    } else {
      // Resizing has to relayout, so it does so at most once a frame.
      cancelAnimationFrame(g.frame);
      g.frame = requestAnimationFrame(() => {
        el.style.width = Math.max(340, g.rect.w + dx) + "px";
        el.style.height = Math.max(240, g.rect.h + dy) + "px";
      });
    }
  };
  const end = () => {
    const el = node.current;
    if (!gesture.current || !el) return;
    const g = gesture.current;
    gesture.current = null;
    cancelAnimationFrame(g.frame);
    if (g.mode === "move") {
      el.style.left = g.x + "px";
      el.style.top = g.y + "px";
      el.style.transform = "";
    }
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
        "os-window win-" +
        win.key +
        (active ? " is-active" : "") +
        (win.max ? " is-max" : "") +
        (win.min ? " is-min" : "") +
        (win.closing ? " is-closing" : "")
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
          <button type="button" className="ios-back" onClick={onMin}>
            <ChevronLeft size={22} /> Home
          </button>
        ) : (
          <div className="traffic">
            <button
              type="button"
              className="tl-close"
              onClick={onClose}
              aria-label={"Close " + title}
            >
              <svg viewBox="0 0 8 8" aria-hidden="true">
                <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" />
              </svg>
            </button>
            <button
              type="button"
              className="tl-min"
              onClick={onMin}
              aria-label={"Minimise " + title}
            >
              <svg viewBox="0 0 8 8" aria-hidden="true">
                <path d="M1 4h6" />
              </svg>
            </button>
            <button
              type="button"
              className="tl-max"
              onClick={onMax}
              aria-label={(win.max ? "Restore " : "Maximise ") + title}
            >
              <svg viewBox="0 0 8 8" aria-hidden="true">
                <path d="M2 2h3.2L2 5.2V2ZM6 6H2.8L6 2.8V6Z" />
              </svg>
            </button>
          </div>
        )}
        <h2>{title}</h2>
        {narrow ? (
          <button
            type="button"
            className="ios-close"
            onClick={onClose}
            aria-label={"Close " + title}
          >
            <X size={16} />
          </button>
        ) : (
          <span />
        )}
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
      {narrow && (
        <button
          type="button"
          className="ios-home-bar"
          aria-label="Go to Home Screen"
          onClick={onMin}
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
  leaving,
  onClose,
}: {
  hits: (q: string) => Hit[];
  leaving: boolean;
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
    <div
      className={"os-launcher-scrim" + (leaving ? " is-leaving" : "")}
      onPointerDown={onClose}
    >
      <div
        className="os-launcher"
        role="dialog"
        aria-label="Search JA/OS"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="os-launcher-field">
          <Search size={20} />
          <input
            autoFocus
            value={query}
            placeholder="Spotlight Search"
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
                <AppIcon id={hit.app} size={28} />
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

/* ----------------------------------------------------------- Menu bar */

type MenuItem =
  { label: string; run?: () => void; href?: string; hint?: string } | "-";

function MenuBar({
  appName,
  menus,
  theme,
  setTheme,
  onSearch,
}: {
  appName: string;
  menus: [string, MenuItem[]][];
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onSearch: () => void;
}) {
  const now = useClock();
  const music = useSound();
  const [open, setOpen] = useState<string | null>(null);
  const bar = useRef<HTMLElement>(null);
  const mash = useRef<number[]>([]);
  const tapLogo = () => {
    const now = Date.now();
    mash.current = [...mash.current.filter((t) => now - t < 2500), now];
    if (mash.current.length >= 5) unlock("logo");
  };
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) setOpen(null);
    };
    const key = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(null);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  const all: [string, MenuItem[]][] = [...menus];
  return (
    <header className="os-menubar" ref={bar}>
      <nav className="os-menus" aria-label="Menu bar">
        {all.map(([name, items], index) => (
          <div className="os-menu-wrap" key={name}>
            <button
              type="button"
              className={
                (index === 0 ? "os-logo" : index === 1 ? "os-menu-app" : "") +
                (open === name ? " is-open" : "")
              }
              aria-haspopup="menu"
              aria-expanded={open === name}
              onClick={() => {
                if (index === 0) tapLogo();
                setOpen(open === name ? null : name);
              }}
              onPointerEnter={() => open && open !== name && setOpen(name)}
            >
              {index === 0 ? (
                <>
                  ja<span>.</span>
                </>
              ) : index === 1 ? (
                appName
              ) : (
                name
              )}
            </button>
            {open === name && (
              <div className="os-menu" role="menu">
                {items.map((item, i) =>
                  item === "-" ? (
                    <hr key={i} />
                  ) : item.href ? (
                    <a
                      key={item.label}
                      role="menuitem"
                      href={item.href}
                      target={
                        item.href.startsWith("mailto:") ? undefined : "_blank"
                      }
                      rel="noreferrer"
                      onClick={() => setOpen(null)}
                    >
                      {item.label}
                      {item.hint && <kbd>{item.hint}</kbd>}
                    </a>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      key={item.label}
                      onClick={() => {
                        setOpen(null);
                        item.run?.();
                      }}
                    >
                      {item.label}
                      {item.hint && <kbd>{item.hint}</kbd>}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="os-menubar-right">
        <button
          type="button"
          className="os-icon-btn"
          onClick={() => sound.toggle()}
          aria-label={music.enabled ? "Mute music" : "Play music"}
          aria-pressed={music.enabled}
          title={music.enabled ? "Now playing: Lagos After Dark" : "Music off"}
        >
          {music.enabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          {music.enabled && music.playing && (
            <span className="os-eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
        </button>
        <button
          type="button"
          className="os-icon-btn"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={
            "Switch to " + (theme === "light" ? "dark" : "light") + " theme"
          }
        >
          {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <Battery />
        <Wifi />
        <button
          type="button"
          className="os-icon-btn"
          onClick={onSearch}
          aria-label="Search (Ctrl or Command K)"
        >
          <Search size={14} />
        </button>
        <time className="os-clock">{menuDate(now)}</time>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------- Dock */

function Dock({
  items,
  running,
  launching,
  onOpen,
  extras,
  narrow,
}: {
  items: AppId[];
  running: (id: AppId) => boolean;
  launching: AppId | null;
  onOpen: (id: AppId) => void;
  extras?: { network: string; href: string; Icon: typeof Mail }[];
  narrow: boolean;
}) {
  const dock = useRef<HTMLElement>(null);
  const layout = useRef<{
    left: number;
    centers: number[];
    sizes: number[];
    width: number;
  } | null>(null);
  const frame = useRef(0);
  // macOS magnification: icons swell with the pointer's distance and push
  // their neighbours aside. Positions are measured once per hover (offsets
  // ignore transforms), and every frame after that is transforms only.
  const measure = () => {
    const nav = dock.current;
    if (!nav) return null;
    const items = [...nav.querySelectorAll<HTMLElement>(".os-dock-item")];
    const left = nav.getBoundingClientRect().left;
    layout.current = {
      left,
      centers: items.map((el) => el.offsetLeft + el.offsetWidth / 2),
      sizes: items.map((el) => el.offsetWidth),
      width: nav.offsetWidth,
    };
    return layout.current;
  };
  const magnify = (x: number | null) => {
    if (narrow || reducedMotion()) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const nav = dock.current;
      const l = layout.current ?? measure();
      if (!nav || !l) return;
      const items = nav.querySelectorAll<HTMLElement>(".os-dock-item");
      const scale = l.centers.map((c) =>
        x === null
          ? 1
          : 1 + 0.6 * Math.max(0, 1 - Math.abs(x - l.left - c) / 140) ** 1.6,
      );
      const extra = scale.map((m, i) => (m - 1) * l.sizes[i]);
      const total = extra.reduce((a, b) => a + b, 0);
      let before = 0;
      // The button slides; only its icon scales, so the running dot stays put.
      items.forEach((el, i) => {
        const shift = before + extra[i] / 2 - total / 2;
        before += extra[i];
        el.style.transform = `translate3d(${shift}px, 0, 0)`;
        const icon = el.firstElementChild as HTMLElement | null;
        if (icon)
          icon.style.transform = `translate3d(0, ${(1 - scale[i]) * 14}px, 0) scale(${scale[i]})`;
      });
      nav.style.setProperty("--spread", String(1 + total / l.width));
      if (x === null) layout.current = null;
    });
  };
  return (
    <nav
      ref={dock}
      className="os-dock"
      aria-label="Dock"
      onPointerEnter={() => measure()}
      onPointerMove={(event) => magnify(event.clientX)}
      onPointerLeave={() => magnify(null)}
    >
      {items.map((id) => (
        <button
          type="button"
          key={id}
          className={
            "os-dock-item" +
            (running(id) ? " is-running" : "") +
            (launching === id ? " is-launching" : "")
          }
          onClick={() => onOpen(id)}
          data-app={id}
          aria-label={apps[id].title + (running(id) ? " (open)" : "")}
        >
          <AppIcon id={id} size={narrow ? 58 : 50} />
          <span className="os-dock-tip">{apps[id].title}</span>
        </button>
      ))}
      {!!extras?.length && <span className="os-dock-sep" aria-hidden="true" />}
      {extras?.map(({ network, href, Icon }) => (
        <a
          key={network}
          className="os-dock-item"
          href={href}
          target={href.startsWith("mailto:") ? undefined : "_blank"}
          rel="noreferrer"
          aria-label={network}
        >
          <span
            className={"app-icon icon-social icon-" + network}
            aria-hidden="true"
          >
            <Icon />
          </span>
          <span className="os-dock-tip">{network}</span>
        </a>
      ))}
    </nav>
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
  const [banner, setBanner] = useState(false);
  const [launching, setLaunching] = useState<AppId | null>(null);
  const [install, setInstall] = useState<(() => void) | null>(null);
  const secrets = useSecrets();
  const launcherExit = useExit(launcher, 170);
  const secretExit = useExit(!!secrets.latest, 320);
  const lastSecret = useRef<(typeof SECRETS)[number] | null>(null);
  const bannerExit = useExit(banner, 320);
  // Sections whose content is still being verified stay off the home screen.
  const shown = useCallback(
    (id: AppId) =>
      !(
        (id === "blog" && !data.blogs.length) ||
        (id === "achievements" && !data.achievements.length) ||
        (id === "testimonials" && !data.testimonials.length) ||
        (id === "press" && !data.press.length)
      ),
    [data],
  );
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

  // Music needs a gesture. Unlocking is one; deep links wait for the first tap.
  useEffect(() => {
    if (phase !== "desktop") return;
    const first = () => sound.start();
    window.addEventListener("pointerdown", first, { once: true });
    window.addEventListener("keydown", first, { once: true });
    return () => {
      window.removeEventListener("pointerdown", first);
      window.removeEventListener("keydown", first);
    };
  }, [phase]);
  useEffect(() => () => sound.stop(), []);

  // A note banner slides in shortly after reaching the desktop.
  useEffect(() => {
    if (phase !== "desktop") return;
    const show = setTimeout(() => setBanner(true), 2200);
    const hide = setTimeout(() => setBanner(false), 11000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [phase]);

  // "Add to Home Screen" uses the browser's install prompt where available.
  useEffect(() => {
    const ready = (event: Event) => {
      event.preventDefault();
      const prompt = event as Event & { prompt: () => Promise<void> };
      setInstall(() => () => void prompt.prompt());
    };
    window.addEventListener("beforeinstallprompt", ready);
    return () => window.removeEventListener("beforeinstallprompt", ready);
  }, []);

  const place = useCallback(
    (key: AppId, count: number): Pick<Win, "x" | "y" | "w" | "h"> => {
      const left = bounds.w >= 1180 ? 40 : 16;
      const right = bounds.w >= 1180 ? 130 : 16;
      const room = bounds.w - left - right;
      const step = (count % 5) * 28;
      const [pw, ph] = apps[key].size ?? [1080, 780];
      const w = Math.min(pw, room - 40 - step);
      const y = MENU + 22 + step;
      const h = Math.min(ph, bounds.h - DOCK - 16 - y);
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
        if (!reducedMotion()) {
          setLaunching(key);
          setTimeout(() => setLaunching(null), 700);
        }
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
    const state = location.state as { open?: string } | null;
    const asked = state?.open === "welcome";
    if (location.pathname === "/" && !asked) {
      // Plain "/" is the home screen with nothing open: unlocking and reloading
      // land here. Phones also put away a window still in front; the desktop
      // keeps its windows as they are.
      if (narrow)
        setWins((list) =>
          list.some((w) => !w.min)
            ? list.map((w) => ({ ...w, min: true }))
            : list,
        );
      return;
    }
    const key = appForPath(location.pathname) ?? "welcome";
    // Keep search and hash so ?meeting= and #leadership still land.
    ensure(key, location.pathname + location.search + location.hash);
  }, [
    location.pathname,
    location.search,
    location.hash,
    location.state,
    phase,
    narrow,
    ensure,
  ]);

  const visible = wins.filter((w) => !w.min && !w.closing);
  const top = visible.reduce<Win | null>(
    (a, w) => (!a || w.z > a.z ? w : a),
    null,
  );
  const here = location.pathname + location.search + location.hash;

  const focus = (win: Win) => {
    if (top?.key === win.key) return;
    zTop.current += 1;
    const z = zTop.current;
    setWins((list) => list.map((w) => (w.key === win.key ? { ...w, z } : w)));
    if (win.path && win.path !== here) navigate(win.path, { replace: true });
  };
  const leaveUrl = (gone: AppId) => {
    const rest = visible
      .filter((w) => w.key !== gone && w.path)
      .sort((a, b) => b.z - a.z);
    if (rest[0]?.path) navigate(rest[0].path, { replace: true });
    else navigate("/", { replace: true });
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
      reducedMotion() ? 0 : narrow ? 380 : 200,
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
      // Welcome is "/", which by itself means the home screen, so it asks for
      // itself by name.
      if (key === "welcome") navigate("/", { state: { open: "welcome" } });
      else if (apps[key].path) navigate(apps[key].path);
      else ensure(key);
    },
    [navigate, ensure],
  );
  const openPath = useCallback((path: string) => navigate(path), [navigate]);
  // Minimise everything in one go; per-window minimise would point the URL at
  // the next window and reopen it.
  const goHome = () => {
    setWins((list) => list.map((w) => ({ ...w, min: true })));
    navigate("/", { replace: true });
  };

  // The Konami code, typed anywhere.
  useEffect(() => {
    const code =
      "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a";
    let typed: string[] = [];
    const key = (event: KeyboardEvent) => {
      typed = [
        ...typed,
        event.key.length === 1 ? event.key.toLowerCase() : event.key,
      ].slice(-10);
      if (typed.join(" ") === code) unlock("konami");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  // A found secret shows as a banner for a few seconds.
  useEffect(() => {
    if (!secrets.latest) return;
    const hide = setTimeout(dismissLatest, 5000);
    return () => clearTimeout(hide);
  }, [secrets.latest]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLauncher((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const titleFor = (win: Win) => {
    if (win.key === "project") {
      const slug = win.path?.split(/[?#]/)[0].split("/")[2];
      const project = data.projects.find((p) => projectSlug(p) === slug);
      return project ? projectName(project) : "Project";
    }
    if (win.key === "welcome" && win.path && win.path.split(/[?#]/)[0] !== "/")
      return pageTitles[win.path.split(/[?#]/)[0]] ?? "Not found";
    return apps[win.key].title;
  };

  const hits = useMemo(() => {
    const all: Hit[] = [
      ...Object.values(apps)
        .filter((app) => app.id !== "project" && shown(app.id))
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
  }, [data.projects, openApp, openPath, shown]);

  const socials = data.social.map((item) => ({
    ...item,
    Icon:
      item.network === "github"
        ? Github
        : item.network === "linkedin"
          ? Linkedin
          : Mail,
  }));
  const email = data.social.find((item) => item.network === "email")?.href;
  const running = (id: AppId) => wins.some((w) => w.key === id && !w.closing);
  const onDock = (id: AppId) => {
    const win = wins.find((w) => w.key === id && !w.closing);
    if (win && !win.min && top?.key === id && !narrow) minimise(win);
    else openApp(id);
  };

  if (phase === "lock")
    return (
      <LockScreen
        narrow={narrow}
        onUnlock={(path, app) => {
          sound.start();
          setPhase("desktop");
          if (path) navigate(path);
          else if (app) {
            navigate("/", { replace: true });
            ensure(app);
          }
        }}
      />
    );

  const menus: [string, MenuItem[]][] = [
    [
      "ja",
      [
        { label: "About JA/OS", run: () => ensure("sysinfo") },
        { label: "About Josiah", run: () => openApp("about") },
        {
          label: `Secrets (${secrets.found.length}/${SECRETS.length})`,
          run: () => ensure("secrets"),
        },
        "-",
        ...(data.resume
          ? [{ label: "Download résumé", href: data.resume }]
          : []),
        { label: "Lock Screen", run: () => setPhase("lock"), hint: "⌃⌘Q" },
        { label: "Restart…", run: () => setPhase("boot") },
      ],
    ],
    [
      "app",
      [
        {
          label: "About " + (top ? titleFor(top) : "Finder"),
          run: () => ensure("sysinfo"),
        },
        "-",
        ...(top
          ? [
              {
                label: "Hide " + titleFor(top),
                run: () => minimise(top),
                hint: "⌘H",
              },
              {
                label: "Quit " + titleFor(top),
                run: () => close(top),
                hint: "⌘Q",
              },
            ]
          : [{ label: "Open Welcome", run: () => openApp("welcome") }]),
      ],
    ],
    [
      "File",
      [
        { label: "New Message", run: () => openApp("contact"), hint: "⌘N" },
        { label: "New Terminal Window", run: () => ensure("terminal") },
        { label: "Book a Meeting…", run: () => ensure("calendar") },
        "-",
        ...(top
          ? [{ label: "Close Window", run: () => close(top), hint: "⌘W" }]
          : []),
      ],
    ],
    [
      "Edit",
      [
        {
          label: "Copy Email Address",
          run: () =>
            email &&
            void navigator.clipboard?.writeText(email.replace("mailto:", "")),
        },
        {
          label: "Copy Portfolio Link",
          run: () => void navigator.clipboard?.writeText(window.location.href),
        },
      ],
    ],
    [
      "View",
      [
        {
          label: theme === "light" ? "Dark Appearance" : "Light Appearance",
          run: () => setTheme(theme === "light" ? "dark" : "light"),
        },
        {
          label: "Enter Full Screen",
          run: () => void document.documentElement.requestFullscreen?.(),
          hint: "⌃⌘F",
        },
        { label: "Spotlight Search", run: () => setLauncher(true), hint: "⌘K" },
      ],
    ],
    [
      "Window",
      [
        ...(top
          ? [
              { label: "Minimise", run: () => minimise(top), hint: "⌘M" },
              { label: "Zoom", run: () => maximise(top) },
              "-" as const,
            ]
          : []),
        ...wins
          .filter((w) => !w.closing)
          .map((w) => ({
            label: (top?.key === w.key ? "✓ " : "   ") + titleFor(w),
            run: () => (w.path ? navigate(w.path) : ensure(w.key)),
          })),
      ],
    ],
    [
      "Help",
      [
        { label: "Search", run: () => setLauncher(true), hint: "⌘K" },
        { label: "Terminal Commands", run: () => ensure("terminal") },
        ...socials.map((s) => ({
          label: "Find me on " + s.network,
          href: s.href,
        })),
      ],
    ],
  ];

  const homeVisible = narrow && !top;
  // On phones the banner would cover the app's back button, so it only
  // appears over the home screen.
  const bannerNote = bannerExit.mounted &&
    top?.key !== "contact" &&
    (!narrow || homeVisible) && (
      <button
        type="button"
        className={"os-banner" + (bannerExit.leaving ? " is-leaving" : "")}
        onClick={() => {
          setBanner(false);
          openApp("contact");
        }}
      >
        <AppIcon id="contact" size={38} />
        <span className="os-note-text">
          <span className="os-note-head">
            <b>Leave Josiah a note ✍️</b>
            <time>now</time>
          </span>
          <span>Tap to say hello. It goes straight to his inbox.</span>
        </span>
      </button>
    );

  const latest = SECRETS.find((x) => x.id === secrets.latest);
  if (latest) lastSecret.current = latest;
  const found = lastSecret.current;
  const secretNote = secretExit.mounted && found && (
    <button
      type="button"
      className={
        "os-banner is-secret" + (secretExit.leaving ? " is-leaving" : "")
      }
      onClick={() => {
        dismissLatest();
        ensure("secrets");
      }}
    >
      <AppIcon id="secrets" size={38} />
      <span className="os-note-text">
        <span className="os-note-head">
          <b>🏆 Secret found: {found.title}</b>
          <time>now</time>
        </span>
        <span>
          {secrets.found.length} of {SECRETS.length} found. Tap to see the rest.
        </span>
      </span>
    </button>
  );

  return (
    <div
      className={
        "os" + (narrow ? " is-narrow" : "") + (homeVisible ? " show-home" : "")
      }
    >
      <Wallpaper />

      {narrow ? (
        <header className="ios-status">
          <time>{shortTime(now).replace(/\s?[AP]M$/i, "")}</time>
          <span className="ios-status-right">
            <Signal />
            <Wifi />
            <Battery showPercent />
          </span>
        </header>
      ) : (
        <MenuBar
          appName={top ? titleFor(top) : "Finder"}
          menus={menus}
          theme={theme}
          setTheme={setTheme}
          onSearch={() => setLauncher(true)}
        />
      )}

      {/* Crawlable links for search engines and screen readers. */}
      <nav className="sr-only" aria-label="Site pages">
        {Object.values(apps)
          .filter((app) => app.path)
          .map((app) => (
            <Link key={app.id} to={app.path!}>
              {app.title}
            </Link>
          ))}
      </nav>

      {narrow ? (
        <div className="ios-home">
          <ul className="ios-grid" aria-label="Apps">
            <li className="ios-widget">
              <button
                type="button"
                onClick={() => (install ? install() : openApp("about"))}
                aria-label={install ? "Add to Home Screen" : "About Josiah"}
              >
                <img src="/media/lock-tall.webp" alt="" />
                <span>{install ? "Add to Home Screen" : data.home.name}</span>
              </button>
            </li>
            <li className="ios-widget">
              <Stats onOpen={() => openApp("work")} />
            </li>
            {homeApps.filter(shown).map((id) => (
              <li key={id}>
                <button type="button" data-app={id} onClick={() => openApp(id)}>
                  <AppIcon id={id} size={60} />
                  <span>{apps[id].title}</span>
                </button>
              </li>
            ))}
            {socials
              .filter((s) => s.network !== "email")
              .map(({ network, href, Icon }) => (
                <li key={network}>
                  <a href={href} target="_blank" rel="noreferrer">
                    <span
                      className={"app-icon icon-social icon-" + network}
                      style={{ ["--s" as string]: "60px" }}
                      aria-hidden="true"
                    >
                      <Icon />
                    </span>
                    <span>{network === "github" ? "GitHub" : "LinkedIn"}</span>
                  </a>
                </li>
              ))}
          </ul>
          <button
            type="button"
            className="ios-search"
            onClick={() => setLauncher(true)}
          >
            <Search size={14} /> Search
          </button>
        </div>
      ) : (
        <div className="os-desk">
          <Stats onOpen={() => openApp("work")} />
          <ul className="os-icons" aria-label="Apps">
            {desktopApps.filter(shown).map((id) => (
              <li key={id}>
                <button type="button" data-app={id} onClick={() => openApp(id)}>
                  <AppIcon id={id} size={48} />
                  <span>{apps[id].title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
            onMin={() => (narrow ? goHome() : minimise(win))}
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
            ) : win.key === "calendar" ? (
              <Calendar open={openPath} />
            ) : win.key === "safari" ? (
              <Safari open={openPath} />
            ) : win.key === "notes" ? (
              <Notes />
            ) : win.key === "messages" ? (
              <Messages open={openPath} openApp={openApp} />
            ) : win.key === "pocket" ? (
              <Pocket
                cart={
                  (CARTS.find(
                    (c) =>
                      c.id ===
                      new URLSearchParams(win.path?.split("?")[1]).get("c"),
                  )?.id ?? null) as CartId | null
                }
                setCart={(c) =>
                  navigate(c ? "/pocket?c=" + c : "/pocket", { replace: true })
                }
                open={openPath}
              />
            ) : win.key === "secrets" ? (
              <Secrets />
            ) : win.key === "sysinfo" ? (
              <SysInfo open={openPath} />
            ) : (
              <div className="os-page">
                <RouteView path={win.path ?? "/"} />
              </div>
            )}
          </OsWindow>
        ))}
      </main>

      {secretNote || bannerNote}

      <Dock
        items={narrow ? phoneDock : dockApps}
        running={running}
        launching={launching}
        onOpen={onDock}
        extras={narrow ? undefined : socials}
        narrow={narrow}
      />

      {launcherExit.mounted && (
        <Launcher
          hits={hits}
          leaving={launcherExit.leaving}
          onClose={() => setLauncher(false)}
        />
      )}
    </div>
  );
}
