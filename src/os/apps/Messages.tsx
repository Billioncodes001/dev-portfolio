import { useEffect, useRef, useState } from "react";
import { usePortfolio } from "../../hooks/usePortfolio";
import { projectName } from "../../components/UI";
import { reducedMotion } from "../util";
import { unlock } from "../secrets";

type Bubble = { from: "me" | "them"; text: string };

/**
 * A chat with Josiah: tap a question and he answers, iMessage style, from
 * the same data the rest of the portfolio uses. The last chip hands over to
 * Mail for a real conversation.
 */
export default function Messages({ open }: { open: (path: string) => void }) {
  const data = usePortfolio();
  const current = data.experiences.find((e) => /present/i.test(e.dateText));
  const tools = data.skills.flatMap((s) => s.items.map((i) => i.title));
  const featured = data.projects.slice(0, 3).map(projectName);
  const lead = data.leadership[0];

  const answers: Record<string, string[]> = {
    "What do you do?": [
      `I'm a full-stack software engineer from Nigeria. I build web interfaces, the APIs behind them, and the bits that connect the two.`,
      current
        ? `Right now I'm ${current.title} at ${current.subtitle.split(",")[0]}.`
        : `I also run Billioncodes.`,
    ],
    "What's your stack?": [
      `Mostly ${tools.slice(0, 5).join(", ")}.`,
      `The full list is in Toolkit, ${tools.length} tools and counting.`,
    ],
    "Show me your best work": [
      `Start with ${featured.join(", ")}.`,
      `There are ${data.projects.length} projects in Work, and the live ones open in Safari.`,
    ],
    "Do you do anything besides code?": lead
      ? [
          `Yes. I'm ${lead.title} for ${lead.organization}.`,
          `The full story is in Notes, under Leadership.`,
        ]
      : [`Student leadership. It's all in Notes.`],
    "Tell me a secret 🤫": [
      `Okay, but keep it between us.`,
      `There are 7 secrets hidden in this OS. You just found one. 👀`,
    ],
    "Can we work together?": [
      `Tell me what you're building and I'll get back to you.`,
      `Tap below to write me a proper message. It lands in my inbox.`,
    ],
  };

  const [log, setLog] = useState<Bubble[]>([
    { from: "them", text: "Hey 👋 I'm Josiah. Ask me anything below." },
  ]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [log, typing]);

  const ask = (question: string) => {
    if (typing) return;
    if (question.startsWith("Tell me a secret")) unlock("chat");
    setAsked((a) => [...a, question]);
    setLog((l) => [...l, { from: "me", text: question }]);
    const replies = answers[question];
    const gap = reducedMotion() ? 0 : 900;
    setTyping(true);
    replies.forEach((text, i) => {
      timers.current.push(
        window.setTimeout(
          () => {
            setLog((l) => [...l, { from: "them", text }]);
            if (i === replies.length - 1) setTyping(false);
          },
          gap * (i + 1),
        ),
      );
    });
  };

  return (
    <div className="messages">
      <header className="messages-head">
        <img src="/media/lock-tall.webp" alt="" />
        <b>Josiah</b>
        <span>usually replies instantly (here, anyway)</span>
      </header>
      <div className="messages-log" role="log" aria-live="polite">
        {log.map((b, i) => (
          <p key={i} className={"bubble from-" + b.from}>
            {b.text}
          </p>
        ))}
        {typing && (
          <p
            className="bubble from-them is-typing"
            aria-label="Josiah is typing"
          >
            <i />
            <i />
            <i />
          </p>
        )}
        <div ref={end} />
      </div>
      <div className="messages-chips" role="group" aria-label="Ask Josiah">
        {Object.keys(answers)
          .filter((q) => !asked.includes(q))
          .map((q) => (
            <button key={q} type="button" onClick={() => ask(q)}>
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
    </div>
  );
}
