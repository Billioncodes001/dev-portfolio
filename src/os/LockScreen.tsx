import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, Flashlight, Camera, LockKeyhole } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { projectName, projectSlug, projectSummary } from "../components/UI";
import type { AppId } from "./apps";
import AppIcon from "./AppIcon";
import { Battery, Signal, Wifi } from "./StatusIcons";
import {
  currentRole,
  longDate,
  reducedMotion,
  shortTime,
  useClock,
} from "./util";

type Note = {
  app: AppId;
  title: string;
  when: string;
  body: string;
  path?: string;
};

/**
 * iPhone-style lock screen over a full-bleed portrait. Notifications are built
 * from the portfolio data; swipe up, press Enter, or tap one to unlock.
 */
export default function LockScreen({
  narrow,
  onUnlock,
}: {
  narrow: boolean;
  onUnlock: (path?: string, app?: AppId) => void;
}) {
  const data = usePortfolio();
  const now = useClock();
  const screen = useRef<HTMLDivElement>(null);
  const lift = useRef(0);
  const samples = useRef<{ y: number; t: number }[]>([]);
  const [leaving, setLeaving] = useState(false);
  const [torch, setTorch] = useState(false);
  const start = useRef<number | null>(null);
  const latest = data.projects[0];
  const role = currentRole(data.experiences);
  const lead = data.leadership[0];
  // The newest dated activity after the standing role reads as a headline.
  const news = data.leadership.find(
    (e, i) => i > 0 && /\d{4}/.test(e.period) && !/–/.test(e.period),
  );

  const unlock = useCallback(
    (path?: string, app?: AppId) => {
      const el = screen.current;
      if (el) el.style.transition = "";
      setLeaving(true);
      setTimeout(() => onUnlock(path, app), reducedMotion() ? 0 : 380);
    },
    [onUnlock],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!["Enter", " ", "ArrowUp"].includes(event.key)) return;
      if ((event.target as HTMLElement).closest("button")) return;
      event.preventDefault();
      unlock();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [unlock]);

  const notes: Note[] = [
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
  if (news)
    notes.push({
      app: "achievements",
      title: "📰 In the news · " + news.title,
      when: news.period,
      body: news.description,
      path: "/press",
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

  // The screen follows the finger 1:1 (with a little resistance past the
  // threshold); the photo trails behind for depth. All of it is transforms
  // written straight to the DOM, so a drag never re-renders React.
  const paint = (y: number) => {
    const el = screen.current;
    if (!el) return;
    const h = el.offsetHeight || 800;
    const d = y < 260 ? y : 260 + (y - 260) * 0.45;
    lift.current = y;
    el.style.transform = d ? `translate3d(0, ${-d}px, 0)` : "";
    el.style.opacity = d ? String(Math.max(0.35, 1 - d / (h * 0.9))) : "";
    const photo = el.querySelector<HTMLElement>(".os-lock-photo");
    if (photo)
      photo.style.transform = d
        ? `translate3d(0, ${d * 0.45}px, 0) scale(${1 + d * 0.00012})`
        : "";
  };
  const settle = () => {
    const el = screen.current;
    if (!el) return;
    el.style.transition =
      "transform 0.5s var(--spring-soft), opacity 0.35s var(--ease-out)";
    const photo = el.querySelector<HTMLElement>(".os-lock-photo");
    if (photo) photo.style.transition = "transform 0.5s var(--spring-soft)";
    paint(0);
  };
  return (
    <div
      className={
        "os-lock" +
        (leaving ? " is-leaving" : "") +
        (narrow ? " is-narrow" : "")
      }
      ref={screen}
      onPointerDown={(event) => {
        // The bottom "Swipe up" strip is where people swipe, so only real
        // controls (notifications, torch, camera) opt out of dragging.
        if (
          (event.target as HTMLElement).closest(
            ".os-notes button, .os-lock-round",
          )
        )
          return;
        start.current = event.clientY;
        samples.current = [{ y: event.clientY, t: event.timeStamp }];
        event.currentTarget.style.transition = "none";
        const photo =
          event.currentTarget.querySelector<HTMLElement>(".os-lock-photo");
        if (photo) photo.style.transition = "none";
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current === null) return;
        samples.current = [
          ...samples.current.filter((p) => event.timeStamp - p.t < 100),
          { y: event.clientY, t: event.timeStamp },
        ];
        paint(Math.max(0, start.current - event.clientY));
      }}
      onPointerUp={(event) => {
        if (start.current === null) return;
        start.current = null;
        // A quick flick unlocks even when it is short.
        const first = samples.current[0];
        const v = first
          ? (first.y - event.clientY) / Math.max(1, event.timeStamp - first.t)
          : 0;
        if (lift.current > 110 || (lift.current > 24 && v > 0.55)) unlock();
        else settle();
      }}
      onPointerCancel={() => {
        start.current = null;
        settle();
      }}
    >
      <picture className="os-lock-photo" aria-hidden="true">
        <source
          media="(max-aspect-ratio: 1/1)"
          srcSet="/media/lock-tall.webp"
        />
        <img src="/media/lock-wide.webp" alt="" />
      </picture>
      {torch && <div className="os-lock-torch" aria-hidden="true" />}
      {narrow && (
        <div className="ios-status ios-status-lock">
          <span />
          <span className="ios-status-right">
            <Signal />
            <Wifi />
            <Battery />
          </span>
        </div>
      )}
      <header className="os-lock-clock">
        <LockKeyhole className="os-lock-glyph" size={18} aria-hidden="true" />
        <p>{longDate(now)}</p>
        <h1 aria-label={"The time is " + shortTime(now)}>
          {shortTime(now).replace(/\s?[AP]M$/i, "")}
        </h1>
        <p className="os-lock-hello">
          You've reached <strong>{data.home.name}</strong>
        </p>
      </header>
      <ul className="os-notes" aria-label="Notifications">
        {notes.map((note, index) => (
          <li
            key={note.title}
            style={{ animationDelay: 500 + index * 140 + "ms" }}
          >
            <button type="button" onClick={() => unlock(note.path, note.app)}>
              <AppIcon id={note.app} size={36} />
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
      <footer className="os-lock-foot">
        {narrow && (
          <button
            type="button"
            className={"os-lock-round" + (torch ? " is-on" : "")}
            aria-label={torch ? "Turn torch off" : "Turn torch on"}
            aria-pressed={torch}
            onClick={() => setTorch((v) => !v)}
          >
            <Flashlight size={20} />
          </button>
        )}
        <button type="button" className="os-unlock" onClick={() => unlock()}>
          <ChevronUp size={18} aria-hidden="true" />
          {narrow ? "Swipe up to unlock" : "Swipe up or press Enter to unlock"}
        </button>
        {narrow && (
          <button
            type="button"
            className="os-lock-round"
            aria-label="Open Photos"
            onClick={() => unlock("/gallery", "gallery")}
          >
            <Camera size={20} />
          </button>
        )}
      </footer>
      {narrow && <span className="ios-home-bar" aria-hidden="true" />}
    </div>
  );
}
