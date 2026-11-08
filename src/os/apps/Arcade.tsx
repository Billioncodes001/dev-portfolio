import { useEffect, useRef, useState } from "react";
import { unlock } from "../secrets";

const HOLES = 9;
const ROUND = 20;
const BEST = "ja-os-arcade-best";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Bug Squash, on a pocket console: bugs pop out of a 3×3 board and you have
 * twenty seconds to squash as many as you can. Arrow keys move the cursor and
 * A (or Enter/Space) squashes, so it plays without a mouse too.
 */
export default function Arcade() {
  const [state, setState] = useState<"idle" | "play" | "over">("idle");
  const [bugs, setBugs] = useState<number[]>([]);
  const [splat, setSplat] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(ROUND);
  const [best, setBest] = useState(readBest);
  const [cursor, setCursor] = useState(4);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (state !== "play") return;
    const clock = setInterval(() => setLeft((s) => s - 1), 1000);
    // Bugs speed up as the round goes on.
    let pace = 900;
    let timer = 0;
    const spawn = () => {
      setBugs((list) => {
        const free = [...Array(HOLES).keys()].filter((i) => !list.includes(i));
        const next = free[Math.floor(Math.random() * free.length)];
        const kept = list.length >= 3 ? list.slice(1) : list;
        return next === undefined ? kept : [...kept, next];
      });
      pace = Math.max(420, pace - 25);
      timer = window.setTimeout(spawn, pace);
    };
    spawn();
    return () => {
      clearInterval(clock);
      clearTimeout(timer);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "play" || left > 0) return;
    setState("over");
    setBugs([]);
    const final = scoreRef.current;
    if (final >= 15) unlock("arcade");
    if (final > best) {
      setBest(final);
      try {
        localStorage.setItem(BEST, String(final));
      } catch {
        /* High score is optional. */
      }
    }
  }, [left, state, best]);

  const start = () => {
    scoreRef.current = 0;
    setScore(0);
    setLeft(ROUND);
    setBugs([]);
    setState("play");
  };
  const hit = (hole: number) => {
    setCursor(hole);
    if (state !== "play") return start();
    if (!bugs.includes(hole)) return;
    setBugs((list) => list.filter((b) => b !== hole));
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setSplat(hole);
    setTimeout(() => setSplat((s) => (s === hole ? null : s)), 220);
  };

  const onKey = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    if (event.key in moves) {
      event.preventDefault();
      setCursor((c) => {
        const n = c + moves[event.key];
        return n < 0 || n >= HOLES ? c : n;
      });
    } else if (["Enter", " ", "a", "A"].includes(event.key)) {
      event.preventDefault();
      hit(cursor);
    }
  };

  return (
    <div className="arcade">
      <div className="arcade-console">
        <p className="arcade-brand">● ja. pocket</p>
        <div
          className="arcade-screen"
          tabIndex={0}
          role="application"
          aria-label="Bug Squash. Arrow keys move, Enter squashes."
          onKeyDown={onKey}
        >
          <div className="arcade-hud" aria-live="polite">
            <span>Score {score}</span>
            <span>{state === "play" ? `${left}s` : `Best ${best}`}</span>
          </div>
          <div className="arcade-board">
            {[...Array(HOLES).keys()].map((hole) => (
              <button
                type="button"
                key={hole}
                tabIndex={-1}
                className={
                  "arcade-hole" +
                  (cursor === hole ? " is-cursor" : "") +
                  (bugs.includes(hole) ? " has-bug" : "") +
                  (splat === hole ? " is-splat" : "")
                }
                aria-label={bugs.includes(hole) ? "Bug" : "Empty"}
                onClick={() => hit(hole)}
              >
                <span aria-hidden="true">
                  {splat === hole ? "💥" : bugs.includes(hole) ? "🐛" : ""}
                </span>
              </button>
            ))}
          </div>
          {state !== "play" && (
            <div className="arcade-overlay">
              <b>
                {state === "over" ? `You squashed ${score}!` : "BUG SQUASH"}
              </b>
              <span>
                {state === "over"
                  ? score >= 15
                    ? "Exterminator. Ship it."
                    : "Production still has bugs. Again?"
                  : "Squash bugs before the deploy"}
              </span>
            </div>
          )}
        </div>
        <div className="arcade-controls">
          <div className="arcade-dpad" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="arcade-ab">
            <button
              type="button"
              className="arcade-btn"
              onClick={state === "play" ? () => hit(cursor) : start}
            >
              {state === "play" ? "A" : "Start"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
