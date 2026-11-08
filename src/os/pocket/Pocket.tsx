import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Briefcase,
  FolderCode,
  Gamepad2,
  Mail,
  Megaphone,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { usePortfolio } from "../../hooks/usePortfolio";
import { projectName, projectSlug, projectSummary } from "../../components/UI";
import { reducedMotion } from "../util";
import BugSquash from "./BugSquash";
import { createPad, keyButton, type Button, type Pad } from "./input";

export type CartId =
  "about" | "work" | "projects" | "leadership" | "contact" | "game";

type Cart = { id: CartId; label: string; Icon: LucideIcon; tone: string };

export const CARTS: Cart[] = [
  { id: "about", label: "About me", Icon: UserRound, tone: "#f2c94c" },
  { id: "work", label: "Work", Icon: Briefcase, tone: "#b7a6ff" },
  { id: "projects", label: "Projects", Icon: FolderCode, tone: "#f5b34f" },
  { id: "leadership", label: "Leadership", Icon: Megaphone, tone: "#7fd3a8" },
  { id: "contact", label: "Contact", Icon: Mail, tone: "#f4a582" },
  { id: "game", label: "Bug Squash", Icon: Gamepad2, tone: "#ef7d6b" },
];

/* ---------------------------------------------------------- Sound */

let audio: AudioContext | null = null;
const SOUND = "ja-os-pocket-sound";
function soundOn() {
  try {
    return localStorage.getItem(SOUND) !== "off";
  } catch {
    return true;
  }
}
function blip(freq: number, on: boolean) {
  if (!on) return;
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.08);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.09);
  } catch {
    /* Sound is decoration. */
  }
}

/* -------------------------------------------------------- Screens */

function useButtons(pad: Pad, fn: (b: Button) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => pad.subscribe((b) => ref.current(b)), [pad]);
}

/** RPG-style dialogue: a portrait, a nameplate, and lines typed out. */
function Dialogue({ pad, lines }: { pad: Pad; lines: string[] }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[i] ?? "";
  useEffect(() => {
    if (reducedMotion()) return setShown(line.length);
    setShown(0);
    const t = setInterval(
      () =>
        setShown((n) => {
          if (n >= line.length) clearInterval(t);
          return Math.min(line.length, n + 2);
        }),
      28,
    );
    return () => clearInterval(t);
  }, [line]);
  useButtons(pad, (b) => {
    if (b === "a" || b === "right" || b === "down") {
      if (shown < line.length) setShown(line.length);
      else setI((n) => (n + 1) % lines.length);
    } else if (b === "left" || b === "up") setI((n) => Math.max(0, n - 1));
  });
  return (
    <div className="pocket-dialogue">
      <img src="/media/pocket-portrait.png" alt="Pixel portrait of Josiah" />
      <div className="pocket-namebar">
        <b>Josiah</b>
        <span>
          {i + 1} of {lines.length}
        </span>
      </div>
      <p className="pocket-box" aria-live="polite">
        {line.slice(0, shown)}
        {shown >= line.length && <i aria-hidden="true">▼</i>}
      </p>
    </div>
  );
}

type Row = { label: string; right?: string; open: () => void };

/** A cursor menu: up/down to move, A to open. */
function Menu({
  pad,
  title,
  sections,
  start = 0,
  hint = "open",
}: {
  pad: Pad;
  title: string;
  sections: { heading?: string; rows: Row[] }[];
  start?: number;
  hint?: string;
}) {
  const rows = sections.flatMap((s) => s.rows);
  const [cur, setCur] = useState(Math.min(start, rows.length - 1));
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current
      ?.querySelector(".is-cursor")
      ?.scrollIntoView({ block: "nearest" });
  }, [cur]);
  useButtons(pad, (b) => {
    if (b === "up") setCur((c) => (c - 1 + rows.length) % rows.length);
    if (b === "down") setCur((c) => (c + 1) % rows.length);
    if (b === "a" || b === "right") rows[cur]?.open();
  });
  let n = -1;
  return (
    <div className="pocket-menu">
      <h3>{title}</h3>
      <div className="pocket-menu-list" ref={list}>
        {sections.map((s, si) => (
          <div key={si}>
            {s.heading && <h4>{s.heading}</h4>}
            <ul>
              {s.rows.map((r) => {
                n++;
                const k = n;
                return (
                  <li key={k}>
                    <button
                      type="button"
                      tabIndex={-1}
                      className={k === cur ? "is-cursor" : ""}
                      onClick={() => (k === cur ? r.open() : setCur(k))}
                    >
                      <span>{r.label}</span>
                      {r.right && <small>{r.right}</small>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="pocket-hint">
        <kbd>A</kbd> {hint}
      </p>
    </div>
  );
}

/** One item up close. A runs the primary action, B goes back. */
function Detail({
  pad,
  kicker,
  title,
  badge,
  children,
  action,
}: {
  pad: Pad;
  kicker?: string;
  title: string;
  badge?: string;
  children: ReactNode;
  action?: { label: string; run: () => void };
}) {
  const body = useRef<HTMLDivElement>(null);
  useButtons(pad, (b) => {
    if (b === "a") action?.run();
    if (b === "down") body.current?.scrollBy({ top: 40 });
    if (b === "up") body.current?.scrollBy({ top: -40 });
  });
  return (
    <div className="pocket-detail" ref={body}>
      {kicker && <p className="pocket-kicker">{kicker}</p>}
      <h3>{title}</h3>
      {badge && <p className="pocket-badge">{badge}</p>}
      {children}
      {action && (
        <button type="button" className="pocket-action" onClick={action.run}>
          <kbd>A</kbd> {action.label}
        </button>
      )}
    </div>
  );
}

function Title() {
  return (
    <div className="pocket-title">
      <pre aria-hidden="true">{" ▄▄▄▄ \n█▀██▀█\n▀████▀\n ▀  ▀ "}</pre>
      <b>Insert a cartridge</b>
      <span>Drag one into the slot, or click it.</span>
      <span className="pocket-keys">Keys 1–6 work too</span>
    </div>
  );
}

/* ------------------------------------------------------- Console */

const sentences = (text: string) =>
  text
    .split(/\n+/)
    .flatMap((p) => p.match(/[^.!?]+[.!?]+["')]*\s*/g) ?? [p])
    .map((s) => s.trim())
    .filter(Boolean)
    .reduce<string[]>((acc, s) => {
      const last = acc[acc.length - 1];
      if (last && last.length + s.length < 130)
        acc[acc.length - 1] = last + " " + s;
      else acc.push(s);
      return acc;
    }, []);

/**
 * ja. pocket: the portfolio as a handheld. Each section is a cartridge; slot
 * one in and the screen shows it as dialogue, menus and detail pages, driven
 * by the D-pad and A/B. The open cartridge lives in the URL (?c=work).
 */
export default function Pocket({
  cart: urlCart,
  setCart,
  open,
}: {
  cart: CartId | null;
  setCart: (id: CartId | null) => void;
  open: (path: string) => void;
}) {
  const data = usePortfolio();
  // The screen switches at once; the URL follows a render later.
  const [cart, setCartNow] = useState(urlCart);
  const [sound, setSound] = useState(soundOn);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const pad = useMemo(
    () =>
      createPad((b) =>
        blip(b === "a" ? 880 : b === "b" ? 330 : 600, soundRef.current),
      ),
    [],
  );
  const [detail, setDetail] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [dragging, setDragging] = useState<{
    id: CartId;
    x: number;
    y: number;
  } | null>(null);
  const [inserting, setInserting] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // A new cartridge starts at the top, in the same render it appears.
  const setLocalCart = (id: CartId | null) => {
    setCartNow(id);
    setDetail(null);
    setCursor(0);
  };
  const [seen, setSeen] = useState(urlCart);
  if (urlCart !== seen) {
    setSeen(urlCart);
    if (urlCart !== cart) setLocalCart(urlCart);
  }
  useEffect(() => {
    if (!cart || reducedMotion()) return;
    setInserting(true);
    const t = setTimeout(() => setInserting(false), 450);
    return () => clearTimeout(t);
  }, [cart]);
  useEffect(() => root.current?.focus({ preventScroll: true }), []);

  const insert = (id: CartId) => {
    blip(220, soundRef.current);
    setLocalCart(id);
    setCart(id);
  };
  const eject = () => {
    blip(160, soundRef.current);
    setLocalCart(null);
    setCart(null);
  };
  // B steps back out of a detail, then ejects.
  useButtons(pad, (b) => {
    if (b !== "b" || cart === "game") return;
    if (detail !== null) setDetail(null);
    else if (cart) eject();
  });

  const onKey = (event: React.KeyboardEvent) => {
    if (/^[1-6]$/.test(event.key)) {
      insert(CARTS[Number(event.key) - 1].id);
      event.preventDefault();
      return;
    }
    const b = keyButton(event.key);
    if (!b) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) pad.down(b);
  };
  const onKeyUp = (event: React.KeyboardEvent) => {
    const b = keyButton(event.key);
    if (b) pad.up(b);
  };

  // Cartridges drag into the slot; a plain click inserts too.
  const grab = (id: CartId) => (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const sx = event.clientX;
    const sy = event.clientY;
    let moved = false;
    const move = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
      moved = true;
      setDragging({ id, x: e.clientX - sx, y: e.clientY - sy });
    };
    const up = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragging(null);
      const r = slot.current?.getBoundingClientRect();
      const near =
        r &&
        e.clientX > r.left - 60 &&
        e.clientX < r.right + 60 &&
        e.clientY > r.top - 90 &&
        e.clientY < r.bottom + 60;
      if (!moved || near) insert(id);
      root.current?.focus({ preventScroll: true });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const hold = (b: Button) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      pad.down(b);
    },
    onPointerUp: () => pad.up(b),
    onPointerCancel: () => pad.up(b),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const openAt = (i: number) => {
    setCursor(i);
    setDetail(i);
  };
  const leadership = data.leadership;
  const news = [...data.press]
    .filter((n) => n.kind === "coverage")
    .sort((a, b) => b.date.localeCompare(a.date));
  const curated = data.projects.filter((p) => p.source !== "github");
  const github = data.projects.filter((p) => p.source === "github");
  const projects = [...curated, ...github];
  const email = data.social.find((s) => s.network === "email")?.href;

  let screen: ReactNode;
  if (!cart) screen = <Title />;
  else if (cart === "about")
    screen = (
      <Dialogue key="about" pad={pad} lines={sentences(data.about.about)} />
    );
  else if (cart === "game") screen = <BugSquash pad={pad} onLeave={eject} />;
  else if (cart === "work") {
    const job = detail !== null ? data.experiences[detail] : null;
    screen = job ? (
      <Detail
        key={"w" + detail}
        pad={pad}
        kicker={job.subtitle}
        title={job.title}
        badge={job.dateText}
        action={{ label: "Open Experience", run: () => open("/experience") }}
      >
        <ul>
          {job.workDescription.slice(0, 4).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Detail>
    ) : (
      <Menu
        key="work"
        pad={pad}
        title="Work"
        start={cursor}
        sections={[
          {
            rows: data.experiences.map((e, i) => ({
              label: e.title,
              right: (e.dateText.match(/\d{4}/g) ?? []).slice(-1)[0] ?? "",
              open: () => openAt(i),
            })),
          },
        ]}
      />
    );
  } else if (cart === "projects") {
    const p = detail !== null ? projects[detail] : null;
    screen = p ? (
      <Detail
        key={"p" + detail}
        pad={pad}
        kicker={p.tags[0]}
        title={projectName(p)}
        action={{
          label: "Read the case study",
          run: () => open("/projects/" + projectSlug(p)),
        }}
      >
        <p>{projectSummary(p)}</p>
        {p.tags.length > 0 && (
          <p>
            <b>Built with</b> {p.tags.slice(0, 5).join(", ")}
          </p>
        )}
        {p.links.slice(0, 2).map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
            ▸ {l.text}
          </a>
        ))}
      </Detail>
    ) : (
      <Menu
        key="projects"
        pad={pad}
        title="Projects"
        start={cursor}
        sections={[
          {
            heading: "Built",
            rows: curated.map((p, i) => ({
              label: projectName(p),
              right: p.tags[0],
              open: () => openAt(i),
            })),
          },
          ...(github.length
            ? [
                {
                  heading: "From GitHub",
                  rows: github.map((p, i) => ({
                    label: projectName(p),
                    right: p.tags[0],
                    open: () => openAt(curated.length + i),
                  })),
                },
              ]
            : []),
        ]}
      />
    );
  } else if (cart === "leadership") {
    const e = detail !== null ? leadership[detail] : null;
    const story =
      detail !== null && detail >= leadership.length
        ? news[detail - leadership.length]
        : null;
    screen = story ? (
      <Detail
        key={"n" + detail}
        pad={pad}
        kicker={story.outlet}
        title={story.headline}
        badge={story.date}
        action={{
          label: "Read the article",
          run: () => window.open(story.href, "_blank", "noopener"),
        }}
      >
        <p>{story.summary}</p>
      </Detail>
    ) : e ? (
      <Detail
        key={"l" + detail}
        pad={pad}
        kicker={e.organization}
        title={e.title}
        badge={e.period}
        action={{
          label: "Read the source",
          run: () => window.open(e.sources[0].href, "_blank", "noopener"),
        }}
      >
        <p>{e.description}</p>
        {e.sources.map((s) => (
          <a key={s.href} href={s.href} target="_blank" rel="noreferrer">
            ▸ {s.text}
          </a>
        ))}
      </Detail>
    ) : (
      <Menu
        key="leadership"
        pad={pad}
        title="Leadership"
        start={cursor}
        sections={[
          {
            heading: "NANS Southwest",
            rows: leadership.map((l, i) => ({
              label: l.title,
              right: (l.period.match(/\d{4}/g) ?? []).pop(),
              open: () => openAt(i),
            })),
          },
          ...(news.length
            ? [
                {
                  heading: "In the news",
                  rows: news.map((n, i) => ({
                    label: n.outlet + ": " + n.headline,
                    right: n.date.slice(0, 4),
                    open: () => openAt(leadership.length + i),
                  })),
                },
              ]
            : []),
        ]}
      />
    );
  } else {
    const rows: Row[] = [
      {
        label: "Write me a message",
        right: "Mail",
        open: () => open("/contact"),
      },
      ...(email
        ? [
            {
              label: "Copy my email",
              right: "copy",
              open: () =>
                void navigator.clipboard?.writeText(
                  email.replace("mailto:", ""),
                ),
            },
          ]
        : []),
      ...data.social
        .filter((s) => s.network !== "email")
        .map((s) => ({
          label:
            s.network === "github"
              ? "GitHub"
              : s.network === "linkedin"
                ? "LinkedIn"
                : s.network,
          right: "↗",
          open: () => window.open(s.href, "_blank", "noopener"),
        })),
    ];
    screen = (
      <Menu
        key="contact"
        pad={pad}
        title="Say hello"
        sections={[{ rows }]}
        hint="select"
      />
    );
  }

  const active = CARTS.find((c) => c.id === cart);
  const shelf = (list: Cart[]) => (
    <ul className="pocket-shelf">
      {list.map((c) => {
        const n = CARTS.indexOf(c) + 1;
        const out = c.id === cart;
        return (
          <li key={c.id}>
            {out ? (
              <span className="pocket-cart is-empty" aria-hidden="true" />
            ) : (
              <button
                type="button"
                className={
                  "pocket-cart" + (dragging?.id === c.id ? " is-dragging" : "")
                }
                style={{
                  ["--tone" as string]: c.tone,
                  translate:
                    dragging?.id === c.id
                      ? `${dragging.x}px ${dragging.y}px`
                      : undefined,
                }}
                aria-label={`${c.label} cartridge (key ${n})`}
                onPointerDown={grab(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    insert(c.id);
                  }
                }}
              >
                <span className="pocket-cart-label">
                  <c.Icon size={18} strokeWidth={2.2} />
                  <span>{c.label}</span>
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="pocket">
      {shelf(CARTS.slice(0, 3))}
      <div
        className="pocket-console"
        ref={root}
        tabIndex={0}
        role="application"
        aria-label="ja. pocket console. Arrows move, X or Enter is A, Z or Escape is B, 1 to 6 pick a cartridge."
        onKeyDown={onKey}
        onKeyUp={onKeyUp}
      >
        <p className="pocket-brand">
          <i className={cart ? "is-on" : ""} /> Josiah Adeyemo
        </p>
        <div className={"pocket-screen" + (inserting ? " is-booting" : "")}>
          {screen}
        </div>
        <div className="pocket-controls">
          <div className="pocket-dpad">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Up"
              {...hold("up")}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Right"
              {...hold("right")}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Down"
              {...hold("down")}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Left"
              {...hold("left")}
            />
          </div>
          <div className="pocket-ab">
            <span>
              <button
                type="button"
                tabIndex={-1}
                aria-label="B button, back"
                {...hold("b")}
              />
              B
            </span>
            <span>
              <button
                type="button"
                tabIndex={-1}
                aria-label="A button, select"
                {...hold("a")}
              />
              A
            </span>
          </div>
        </div>
        <div className="pocket-meta">
          <span>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Eject cartridge"
              onClick={eject}
              disabled={!cart}
            />
            Eject
          </span>
          <span>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Sound"
              aria-pressed={sound}
              className={sound ? "is-on" : ""}
              onClick={() => {
                const next = !sound;
                setSound(next);
                try {
                  localStorage.setItem(SOUND, next ? "on" : "off");
                } catch {
                  /* Preference is optional. */
                }
              }}
            />
            Sound
          </span>
        </div>
        <div className="pocket-slot" ref={slot}>
          {active && (
            <button
              type="button"
              tabIndex={-1}
              className={
                "pocket-cart is-in" + (inserting ? " is-inserting" : "")
              }
              style={{ ["--tone" as string]: active.tone }}
              onClick={eject}
              aria-label={`Eject ${active.label}`}
            >
              <span className="pocket-cart-label">
                <span>{active.label}</span>
              </span>
            </button>
          )}
        </div>
      </div>
      {shelf(CARTS.slice(3))}
    </div>
  );
}
