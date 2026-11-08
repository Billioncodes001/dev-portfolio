import {
  Award,
  BookOpen,
  Briefcase,
  Compass,
  Folder,
  Gamepad2,
  GraduationCap,
  KeyRound,
  Mail,
  MessageCircle,
  MessageSquareQuote,
  Newspaper,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { AppId } from "./apps";

/** Glyph icons drawn on a gradient tile; the rest get bespoke markup below. */
const glyphs: Partial<Record<AppId, LucideIcon>> = {
  work: Folder,
  project: Folder,
  about: UserRound,
  experience: Briefcase,
  skills: Wrench,
  education: GraduationCap,
  blog: BookOpen,
  achievements: Award,
  testimonials: MessageSquareQuote,
  contact: Mail,
  safari: Compass,
  messages: MessageCircle,
  pocket: Gamepad2,
  press: Newspaper,
  secrets: KeyRound,
};

/**
 * iOS-style app icon. Sized with --s so the dock can magnify icons without
 * re-rendering their contents.
 */
export default function AppIcon({
  id,
  size = 54,
}: {
  id: AppId;
  size?: number;
}) {
  const Glyph = glyphs[id];
  const today = new Date();
  return (
    <span
      className={"app-icon icon-" + id}
      style={{ ["--s" as string]: size + "px" }}
      aria-hidden="true"
    >
      {Glyph && <Glyph strokeWidth={1.9} />}
      {id === "calendar" && (
        <>
          <b>{today.toLocaleDateString([], { weekday: "short" })}</b>
          <i>{today.getDate()}</i>
        </>
      )}
      {id === "notes" && (
        <>
          <b />
          <i />
          <i />
          <i />
        </>
      )}
      {id === "terminal" && <code>&gt;_</code>}
      {(id === "welcome" || id === "sysinfo") && (
        <strong>
          ja<span>.</span>
        </strong>
      )}
      {id === "gallery" && <em />}
    </span>
  );
}
