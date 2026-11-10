import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUp } from "lucide-react";
import { usePortfolio } from "../../hooks/usePortfolio";
import { projectName, projectSummary, projectSlug } from "../../components/UI";
import type { Portfolio, Project } from "../../../shared/schema";
import { SECRETS, unlock } from "../secrets";
import { reducedMotion } from "../util";
import type { AppId } from "../apps";

/** A button under a message: opens a window, a link, or copies text. */
export type Action =
  | { label: string; path: string }
  | { label: string; app: AppId }
  | { label: string; href: string }
  | { label: string; copy: string };

type Bubble = { from: "me" | "them"; text: string; actions?: Action[] };
type Reply = Omit<Bubble, "from">;

const KEY = "ja-os-messages";
const LIMIT = 60;
const MAX_INPUT = 280;

/** Lowercase, no accents or apostrophes, single spaces, padded for whole-word matching. */
const norm = (text: string) =>
  " " +
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() +
  " ";

const STOP = new Set([
  "studio",
  "solutions",
  "system",
  "record",
  "project",
  "projects",
  "software",
  "client",
  "billioncodes",
  "portfolio",
  "students",
  "management",
  "mini",
  "angular",
  "academy",
  "dev",
  "tech",
  "application",
  "inc",
  "ltd",
]);

/** Each keyword is a phrase; a longer phrase that matches scores higher. */
type Intent = { id: string; words: string[]; reply: () => Reply[] };

/**
 * Automated replies for the Messages app. Every answer is built from the
 * portfolio data, so nothing here claims more than the site does.
 */
function buildAnswers(data: Portfolio) {
  const current = data.experiences.find((e) => /present/i.test(e.dateText));
  const tools = data.skills.flatMap((s) => s.items.map((i) => i.title));
  const roles = data.home.roles;
  const press = [...data.press]
    .filter((p) => p.kind === "coverage")
    .sort((a, b) => b.date.localeCompare(a.date));
  const socials = data.social.filter((s) => s.network !== "email");
  const email = data.social.find((s) => s.network === "email")?.href;
  const write: Action = { label: "Write a message", path: "/contact" };

  const intents: Intent[] = [
    {
      id: "greeting",
      words: [
        "hi",
        "hello",
        "hey",
        "hiya",
        "good morning",
        "good afternoon",
        "good evening",
        "yo",
        "sup",
      ],
      reply: () => [
        {
          text: "Hey 👋 Good to see you here. Ask me about my work, my stack, my leadership, or anything else.",
        },
      ],
    },
    {
      id: "thanks",
      words: ["thanks", "thank you", "thx", "appreciate", "cheers"],
      reply: () => [
        { text: "You're welcome. What else would you like to know?" },
      ],
    },
    {
      id: "bye",
      words: ["bye", "goodbye", "see you", "good night", "later"],
      reply: () => [
        {
          text: "Take care. If you'd like a proper conversation, Mail reaches me directly.",
          actions: [write],
        },
      ],
    },
    {
      id: "role",
      words: [
        "who are you",
        "what do you do",
        "yourself",
        "introduce",
        "your role",
        "what are you",
        "tell me about you",
      ],
      reply: () => [
        { text: `I'm ${roles.join(", ").replace(/, ([^,]*)$/, " and $1")}.` },
        ...(current
          ? [
              {
                text: `Right now I'm ${current.title} at ${current.subtitle.split(",")[0]}.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "stack",
      words: [
        "stack",
        "tech",
        "technologies",
        "technology",
        "language",
        "languages",
        "framework",
        "frameworks",
        "tools",
        "skills",
        "react",
        "typescript",
        "node",
        "python",
        "angular",
      ],
      reply: () => [
        { text: `Mostly ${tools.slice(0, 6).join(", ")}.` },
        {
          text: `The full list is in Toolkit, ${tools.length} tools and counting.`,
          actions: [{ label: "Open Toolkit", path: "/skills" }],
        },
      ],
    },
    {
      id: "experience",
      words: [
        "experience",
        "work history",
        "career",
        "companies",
        "company",
        "employer",
        "employers",
        "work for",
        "worked for",
        "who did you work",
        "worked",
        "job history",
        "roles",
        "where have you worked",
      ],
      reply: () => {
        // The current role leads; the rest keep the order they are listed in.
        const ordered = [
          ...data.experiences.filter((e) => /present/i.test(e.dateText)),
          ...data.experiences.filter((e) => !/present/i.test(e.dateText)),
        ];
        return [
          {
            text:
              "Roles include " +
              ordered
                .slice(0, 3)
                .map((e) => `${e.title} at ${e.subtitle.split(",")[0]}`)
                .join("; ") +
              ".",
            actions: [{ label: "Open Experience", path: "/experience" }],
          },
        ];
      },
    },
    {
      id: "projects",
      words: [
        "project",
        "projects",
        "portfolio",
        "built",
        "build",
        "best work",
        "work samples",
        "apps",
        "app",
        "website",
        "websites",
        "repos",
        "repositories",
        "case study",
        "case studies",
      ],
      reply: () => {
        const top = data.projects.slice(0, 3).map(projectName);
        return [
          { text: `Start with ${top.join(", ")}.` },
          {
            text: `There are ${data.projects.length} projects in Work. The live ones also open in Safari.`,
            actions: [
              { label: "Open Work", path: "/projects" },
              { label: "Open Safari", app: "safari" },
            ],
          },
        ];
      },
    },
    {
      id: "leadership",
      words: [
        "nans",
        "leadership",
        "union",
        "unionism",
        "activist",
        "activism",
        "advocacy",
        "coordinator",
        "zone d",
        "student welfare",
        "politics",
        "political",
        "besides code",
        "beyond code",
        "outside code",
        "besides coding",
        "beyond coding",
        "outside coding",
        "anything else",
        "else do you do",
        "besides work",
      ],
      reply: () => {
        const lead = data.leadership[0];
        return [
          lead
            ? {
                text: `Yes. I'm ${lead.title} for ${lead.organization}. Student welfare is the work I care most about outside code.`,
              }
            : {
                text: "Yes. I'm active in student leadership, mostly around student welfare.",
              },
          {
            text: "The full timeline and sources are in Experience.",
            actions: [
              { label: "Open Leadership", path: "/experience#leadership" },
            ],
          },
        ];
      },
    },
    {
      id: "news",
      words: [
        "news",
        "press",
        "article",
        "articles",
        "coverage",
        "reported",
        "headline",
        "headlines",
        "media",
        "statement",
        "statements",
      ],
      reply: () => {
        const latest = press
          .slice(0, 2)
          .map((p) => `${p.outlet}: ${p.headline}`);
        return latest.length
          ? [
              { text: `Recent coverage: ${latest.join(". ")}.` },
              {
                text: "Every item links to where it was published.",
                actions: [{ label: "Open In the News", path: "/press" }],
              },
            ]
          : [
              {
                text: "Nothing published yet, but the page is ready for it.",
                actions: [{ label: "Open In the News", path: "/press" }],
              },
            ];
      },
    },
    {
      id: "education",
      words: [
        "school",
        "university",
        "college",
        "degree",
        "studied",
        "study",
        "education",
        "polytechnic",
        "schooling",
        "graduate",
        "graduated",
      ],
      reply: () => [
        {
          text:
            data.education
              .map((e) => `${e.cardTitle}, ${e.cardSubtitle}`)
              .join(". ") + ".",
          actions: [{ label: "Open Education", path: "/education" }],
        },
      ],
    },
    {
      id: "hire",
      words: [
        "hire",
        "hiring",
        "available",
        "availability",
        "freelance",
        "contract",
        "collaborate",
        "collaboration",
        "work together",
        "working together",
        "project idea",
        "quote",
        "budget",
        "rate",
        "rates",
        "price",
        "pricing",
        "contact",
        "reach you",
        "get in touch",
        "book a call",
        "meeting",
      ],
      reply: () => [
        {
          text: "Tell me what you're building and I'll get back to you. Write it in Mail so it reaches my inbox.",
          actions: [
            write,
            ...(email
              ? [
                  {
                    label: "Copy my email",
                    copy: email.replace("mailto:", ""),
                  } as Action,
                ]
              : []),
          ],
        },
      ],
    },
    {
      id: "socials",
      words: [
        "github",
        "linkedin",
        "twitter",
        "socials",
        "social",
        "follow",
        "find you",
        "online",
        "profile",
      ],
      reply: () => [
        {
          text: socials.length
            ? "You can find me on the links below."
            : "I'm easiest to reach through Mail.",
          actions: socials.slice(0, 4).map((s) => ({
            label:
              s.network === "github"
                ? "GitHub"
                : s.network === "linkedin"
                  ? "LinkedIn"
                  : s.network,
            href: s.href,
          })),
        },
      ],
    },
    {
      id: "resume",
      words: ["resume", "cv", "curriculum vitae", "curriculum"],
      reply: () =>
        data.resume
          ? [
              {
                text: "Here's my résumé.",
                actions: [{ label: "Open résumé", href: data.resume }],
              },
            ]
          : [
              {
                text: "There's no résumé link on the site yet. Send me a message and I'll sort it out.",
                actions: [write],
              },
            ],
    },
    {
      id: "location",
      words: [
        "where are you",
        "where do you live",
        "location",
        "based",
        "lagos",
        "nigeria",
        "osun",
        "timezone",
        "time zone",
        "remote",
      ],
      reply: () => [
        {
          text: "I'm based in Nigeria. Several of my roles have been remote, so time zones are rarely a problem.",
        },
      ],
    },
    {
      id: "fun",
      words: [
        "game",
        "games",
        "play",
        "bug squash",
        "pocket",
        "console",
        "cartridge",
        "arcade",
      ],
      reply: () => [
        {
          text: "Try ja. pocket in the dock. Slot in a cartridge to read about me, or play Bug Squash.",
          actions: [{ label: "Open ja. pocket", app: "pocket" }],
        },
      ],
    },
    {
      id: "secret",
      words: ["secret", "secrets", "easter egg", "hidden", "hint"],
      reply: () => [
        { text: "Okay, but keep it between us." },
        {
          text: `There are ${SECRETS.length} secrets hidden in this OS. You've just found one. The Secrets app tracks the rest.`,
          actions: [{ label: "Open Secrets", app: "secrets" }],
        },
      ],
    },
    {
      id: "help",
      words: [
        "help",
        "what can i ask",
        "what can i",
        "options",
        "commands",
        "menu",
        "topics",
      ],
      reply: () => [
        {
          text: "Ask me about what I do, my stack, my experience, leadership, press, school, or how to reach me. Tap a suggestion below if you're not sure where to start.",
        },
      ],
    },
  ];

  /** Project names and distinctive words, so "tell me about Vantage" works. */
  const projectIndex = data.projects.map((project) => {
    const name = norm(projectName(project));
    const words = name
      .trim()
      .split(" ")
      .filter((w) => w.length >= 5 && !STOP.has(w));
    return { project, name, words };
  });
  const aboutProject = (project: Project): Reply[] => {
    const live = project.links.find((l) => !/github\.com/.test(l.href));
    const slug = projectSlug(project);
    const actions: Action[] = [
      { label: "Read the case study", path: "/projects/" + slug },
    ];
    if (live) actions.push({ label: "Open live site", href: live.href });
    const built = project.tags.length
      ? `Built with ${project.tags.slice(0, 5).join(", ")}.`
      : "Here's where to look.";
    return [
      { text: `${projectName(project)}: ${projectSummary(project)}` },
      { text: built, actions },
    ];
  };

  /** The best reply for a message, or null when nothing matches. */
  const answer = (raw: string): { replies: Reply[]; secret: boolean } => {
    const text = norm(raw);
    const hit = projectIndex.find(
      (p) =>
        (p.name.trim() && text.includes(" " + p.name.trim() + " ")) ||
        p.words.some((w) => text.includes(" " + w + " ")),
    );
    if (hit) return { replies: aboutProject(hit.project), secret: false };
    let best: { intent: Intent; score: number } | null = null;
    for (const intent of intents) {
      let score = 0;
      for (const word of intent.words) {
        if (text.includes(" " + norm(word).trim() + " "))
          score += word.split(" ").length;
      }
      if (score && (!best || score > best.score)) best = { intent, score };
    }
    if (!best)
      return {
        replies: [
          {
            text: "I didn't quite catch that. Try one of the suggestions below, or write me a message that reaches my inbox.",
            actions: [write],
          },
        ],
        secret: false,
      };
    return {
      replies: best.intent.reply(),
      secret: best.intent.id === "secret",
    };
  };

  return { answer, write };
}

/** Suggestions that stay visible, like a chat app's quick replies. */
const SUGGESTIONS = [
  "What do you do?",
  "What's your stack?",
  "Show me your best work",
  "Do you do anything besides code?",
  "Can we work together?",
  "Tell me a secret 🤫",
];

const SEED: Bubble[] = [
  {
    from: "them",
    text: "Hey 👋 I'm Josiah. Ask me anything below, or tap a suggestion.",
  },
];

function loadLog(): Bubble[] {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (!Array.isArray(raw) || !raw.length) return SEED;
    return raw
      .filter(
        (b) =>
          (b?.from === "me" || b?.from === "them") &&
          typeof b.text === "string",
      )
      .map((b) => ({
        from: b.from,
        text: b.text,
        actions: Array.isArray(b.actions)
          ? b.actions.filter((a: Action) => a && typeof a.label === "string")
          : undefined,
      }))
      .slice(-LIMIT);
  } catch {
    return SEED;
  }
}

/**
 * Messages: a chat with Josiah. Type a question or tap a suggestion and the
 * reply arrives after a short typing pause, with buttons that open the right
 * window. The conversation is kept for this browser session.
 */
export default function Messages({
  open,
  openApp,
}: {
  open: (path: string) => void;
  openApp: (app: AppId) => void;
}) {
  const data = usePortfolio();
  const { answer } = useMemo(() => buildAnswers(data), [data]);
  const [log, setLog] = useState<Bubble[]>(loadLog);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const landsAt = useRef(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(log.slice(-LIMIT)));
    } catch {
      /* History is a convenience; the chat still works without it. */
    }
  }, [log]);
  // Scroll the conversation itself, never the page around it.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [log, pending]);

  const deliver = (replies: Reply[]) => {
    const still = reducedMotion();
    let at = Math.max(Date.now(), landsAt.current) + (still ? 0 : 350);
    for (const reply of replies) {
      at += still ? 0 : Math.min(1400, 500 + reply.text.length * 14);
      setPending((n) => n + 1);
      timers.current.push(
        window.setTimeout(
          () => {
            setLog((l) => [...l, { from: "them", ...reply }]);
            setPending((n) => Math.max(0, n - 1));
          },
          Math.max(0, at - Date.now()),
        ),
      );
    }
    landsAt.current = at;
  };

  const send = (raw: string) => {
    const text = raw.trim().slice(0, MAX_INPUT);
    if (!text) return;
    const { replies, secret } = answer(text);
    if (secret) unlock("chat");
    setLog((l) => [...l, { from: "me", text }]);
    deliver(replies);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
    setDraft("");
  };

  const run = (action: Action) => {
    if ("path" in action) open(action.path);
    else if ("app" in action) openApp(action.app);
    else if ("copy" in action) {
      void navigator.clipboard?.writeText(action.copy);
      setCopied(action.label);
      window.setTimeout(() => setCopied(null), 1600);
    }
  };

  return (
    <div className="messages">
      <header className="messages-head">
        <img src="/media/lock-tall.webp" alt="" />
        <b>Josiah</b>
        <span>
          Automated replies from my portfolio. Mail reaches me directly.
        </span>
      </header>
      <div
        className="messages-log"
        ref={scroller}
        role="log"
        aria-live="polite"
      >
        {log.map((b, i) => (
          <div key={i} className={"bubble-row from-" + b.from}>
            <p className={"bubble from-" + b.from}>{b.text}</p>
            {b.actions && (
              <div className="bubble-actions">
                {b.actions.map((action) =>
                  "href" in action ? (
                    <a
                      key={action.label}
                      href={action.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {action.label} ↗
                    </a>
                  ) : (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => run(action)}
                    >
                      {"copy" in action && copied === action.label
                        ? "Copied"
                        : action.label}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
        {pending > 0 && (
          <p
            className="bubble from-them is-typing"
            role="status"
            aria-label="Josiah is typing"
          >
            <i />
            <i />
            <i />
          </p>
        )}
      </div>
      <div className="messages-chips" role="group" aria-label="Suggestions">
        {SUGGESTIONS.map((q) => (
          <button key={q} type="button" onClick={() => send(q)}>
            {q}
          </button>
        ))}
        <button
          type="button"
          className="is-primary"
          onClick={() => open("/contact")}
        >
          Write a real message ✉️
        </button>
      </div>
      <form className="messages-compose" onSubmit={onSubmit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask me anything"
          aria-label="Message Josiah"
          maxLength={MAX_INPUT}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" aria-label="Send" disabled={!draft.trim()}>
          <ArrowUp size={16} strokeWidth={2.4} />
        </button>
      </form>
    </div>
  );
}
