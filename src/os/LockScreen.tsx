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
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [torch, setTorch] = useState(false);
  const start = useRef<number | null>(null);
  const latest = data.projects[0];
  const role = currentRole(data.experiences);
  const lead = data.leadership[0];

  const unlock = useCallback(
    (path?: string, app?: AppId) => {
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

  const lift = Math.min(drag, 400);
  return (
    <div
      className={
        "os-lock" +
        (leaving ? " is-leaving" : "") +
        (narrow ? " is-narrow" : "")
      }
      style={
        lift
          ? { transform: `translateY(${-lift}px)`, opacity: 1 - lift / 600 }
          : undefined
      }
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
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current !== null)
          setDrag(Math.max(0, start.current - event.clientY));
      }}
      onPointerUp={() => {
        if (start.current === null) return;
        start.current = null;
        if (drag > 110) unlock();
        setDrag(0);
      }}
      onPointerCancel={() => {
        start.current = null;
        setDrag(0);
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
