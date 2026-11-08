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
  | "terminal"
  | "calendar"
  | "safari"
  | "notes"
  | "sysinfo"
  | "messages"
  | "arcade"
  | "secrets";

export type OsApp = {
  id: AppId;
  title: string;
  /** Route the window renders. Apps without a path never touch the URL. */
  path?: string;
  blurb: string;
  /** Preferred window size on wide screens. */
  size?: [number, number];
};

export const apps: Record<AppId, OsApp> = {
  welcome: {
    id: "welcome",
    title: "Welcome",
    path: "/",
    blurb: "Start here: who I am and a few things I've built",
  },
  work: {
    id: "work",
    title: "Work",
    path: "/projects",
    blurb: "Selected projects and live GitHub repositories",
  },
  project: {
    id: "project",
    title: "Project",
    blurb: "A single project, up close",
  },
  about: {
    id: "about",
    title: "About",
    path: "/about",
    blurb: "The human behind the code",
  },
  experience: {
    id: "experience",
    title: "Experience",
    path: "/experience",
    blurb: "Roles, teams and what I did there",
  },
  gallery: {
    id: "gallery",
    title: "Photos",
    path: "/gallery",
    blurb: "Photos from leadership and student life",
  },
  skills: {
    id: "skills",
    title: "Toolkit",
    path: "/skills",
    blurb: "Languages, frameworks and tools",
  },
  education: {
    id: "education",
    title: "Education",
    path: "/education",
    blurb: "Where I studied",
  },
  blog: {
    id: "blog",
    title: "Writing",
    path: "/blog",
    blurb: "Articles and notes",
  },
  achievements: {
    id: "achievements",
    title: "Recognition",
    path: "/achievements",
    blurb: "Awards and milestones",
  },
  testimonials: {
    id: "testimonials",
    title: "Kind words",
    path: "/testimonials",
    blurb: "What people say about working with me",
  },
  contact: {
    id: "contact",
    title: "Mail",
    path: "/contact",
    blurb: "Send me a message. It lands in my inbox",
  },
  terminal: {
    id: "terminal",
    title: "Terminal",
    blurb: "Explore the portfolio from a shell",
    size: [700, 460],
  },
  calendar: {
    id: "calendar",
    title: "Calendar",
    blurb: "Find a time and book a call",
    size: [420, 560],
  },
  safari: {
    id: "safari",
    title: "Safari",
    blurb: "Browse my live projects",
    size: [1100, 720],
  },
  notes: {
    id: "notes",
    title: "Notes",
    blurb: "About me, leadership, and the toolkit, in notes",
    size: [860, 560],
  },
  sysinfo: {
    id: "sysinfo",
    title: "About JA/OS",
    blurb: "The machine behind the portfolio",
    size: [340, 430],
  },
  messages: {
    id: "messages",
    title: "Messages",
    blurb: "Ask me anything, iMessage style",
    size: [420, 600],
  },
  arcade: {
    id: "arcade",
    title: "Bug Squash",
    blurb: "A pocket console game: squash bugs before the deploy",
    size: [380, 600],
  },
  secrets: {
    id: "secrets",
    title: "Secrets",
    blurb: "Seven secrets are hidden in this OS. Find them all",
    size: [380, 520],
  },
};

/** Wide screens: the dock. */
export const dockApps: AppId[] = [
  "welcome",
  "work",
  "calendar",
  "gallery",
  "safari",
  "notes",
  "messages",
  "terminal",
  "contact",
];
/** Wide screens: icons along the right edge of the desktop. */
export const desktopApps: AppId[] = [
  "about",
  "experience",
  "skills",
  "education",
  "blog",
  "achievements",
  "testimonials",
  "arcade",
  "secrets",
];
/** Phones: the home-screen grid (after the photo widget) and the dock. */
export const homeApps: AppId[] = [
  "calendar",
  "work",
  "about",
  "experience",
  "terminal",
  "skills",
  "education",
  "blog",
  "achievements",
  "arcade",
  "secrets",
  "testimonials",
  "welcome",
];
export const phoneDock: AppId[] = ["messages", "safari", "gallery", "contact"];

/** Which window a URL belongs to. Every project detail shares one viewer window. */
export function appForPath(pathname: string): AppId | null {
  if (pathname.startsWith("/projects/")) return "project";
  const match = Object.values(apps).find((app) => app.path === pathname);
  return match ? match.id : null;
}
