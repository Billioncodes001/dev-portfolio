import {
  Award,
  BookOpen,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Images,
  Mail,
  MessageSquareQuote,
  Sparkles,
  SquareTerminal,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AppId =
  | "welcome"
  | "work"
  | "project"
  | "about"
  | "experience"
  | "gallery"
  | "skills"
  | "education"
  | "blog"
  | "achievements"
  | "testimonials"
  | "contact"
  | "terminal";

export type OsApp = {
  id: AppId;
  title: string;
  /** Route the window renders. Apps without a path (the terminal) never touch the URL. */
  path?: string;
  icon: LucideIcon;
  /** Icon tile colours: background, then glyph. */
  tint: [string, string];
  blurb: string;
};

export const apps: Record<AppId, OsApp> = {
  welcome: {
    id: "welcome",
    title: "Welcome",
    path: "/",
    icon: Sparkles,
    tint: ["#d7ed91", "#28381e"],
    blurb: "Start here: who I am and a few things I've built",
  },
  work: {
    id: "work",
    title: "Work",
    path: "/projects",
    icon: FolderGit2,
    tint: ["#2f5d3a", "#e9f6c4"],
    blurb: "Selected projects and live GitHub repositories",
  },
  project: {
    id: "project",
    title: "Project",
    icon: FolderGit2,
    tint: ["#2f5d3a", "#e9f6c4"],
    blurb: "A single project, up close",
  },
  about: {
    id: "about",
    title: "About",
    path: "/about",
    icon: UserRound,
    tint: ["#f3e3c3", "#5a3d12"],
    blurb: "The human behind the code",
  },
  experience: {
    id: "experience",
    title: "Experience",
    path: "/experience",
    icon: Briefcase,
    tint: ["#24323f", "#bfe3ff"],
    blurb: "Roles, teams and what I did there",
  },
  gallery: {
    id: "gallery",
    title: "Gallery",
    path: "/gallery",
    icon: Images,
    tint: ["#ffd8c2", "#7a2e0e"],
    blurb: "Photos from leadership and student life",
  },
  skills: {
    id: "skills",
    title: "Toolkit",
    path: "/skills",
    icon: Wrench,
    tint: ["#e5e1f7", "#3b2f7a"],
    blurb: "Languages, frameworks and tools",
  },
  education: {
    id: "education",
    title: "Education",
    path: "/education",
    icon: GraduationCap,
    tint: ["#dbeee8", "#1d5243"],
    blurb: "Where I studied",
  },
  blog: {
    id: "blog",
    title: "Writing",
    path: "/blog",
    icon: BookOpen,
    tint: ["#fff1b8", "#5c4a00"],
    blurb: "Articles and notes",
  },
  achievements: {
    id: "achievements",
    title: "Recognition",
    path: "/achievements",
    icon: Award,
    tint: ["#f7d9e3", "#6e1f3b"],
    blurb: "Awards and milestones",
  },
  testimonials: {
    id: "testimonials",
    title: "Kind words",
    path: "/testimonials",
    icon: MessageSquareQuote,
    tint: ["#e2ecf9", "#1f3f6e"],
    blurb: "What people say about working with me",
  },
  contact: {
    id: "contact",
    title: "Mail",
    path: "/contact",
    icon: Mail,
    tint: ["#d7ed91", "#28381e"],
    blurb: "Send me a message. It lands in my inbox",
  },
  terminal: {
    id: "terminal",
    title: "Terminal",
    icon: SquareTerminal,
    tint: ["#121612", "#d7ed91"],
    blurb: "Explore the portfolio from a shell",
  },
};

export const dockApps: AppId[] = [
  "welcome",
  "work",
  "about",
  "experience",
  "gallery",
  "terminal",
  "contact",
];
export const desktopApps: AppId[] = [
  "skills",
  "education",
  "blog",
  "achievements",
  "testimonials",
];

/** Which window a URL belongs to. Every project detail shares one viewer window. */
export function appForPath(pathname: string): AppId | null {
  if (pathname.startsWith("/projects/")) return "project";
  const match = Object.values(apps).find((app) => app.path === pathname);
  return match ? match.id : null;
}
