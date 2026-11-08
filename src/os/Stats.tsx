import { useEffect, useRef, useState } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import { reducedMotion } from "./util";

function useCountUp(target: number, run: boolean) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (!run || reducedMotion()) return setValue(target);
    let frame = 0;
    const begin = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - begin) / 1400);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, run]);
  return value;
}

function Stat({
  value,
  label,
  run,
}: {
  value: number;
  label: string;
  run: boolean;
}) {
  const shown = useCountUp(value, run);
  return (
    <span className="os-stat">
      <b>
        {shown}
        {shown === value ? "+" : ""}
      </b>
      <span>{label}</span>
    </span>
  );
}

/**
 * A glass widget of headline numbers that count up when it appears and tilts
 * toward the pointer, so the desktop has some depth.
 */
export default function Stats({ onOpen }: { onOpen: () => void }) {
  const data = usePortfolio();
  const card = useRef<HTMLButtonElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRun(true), 400);
    return () => clearTimeout(t);
  }, []);
  const years = data.experiences
    .flatMap((e) => e.dateText.match(/\d{4}/g) ?? [])
    .map(Number);
  const since = years.length ? Math.min(...years) : new Date().getFullYear();

  const tilt = (event: React.PointerEvent) => {
    const el = card.current;
    if (!el || reducedMotion() || event.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - 0.5;
    const y = (event.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
  };
  const reset = () => {
    card.current?.style.setProperty("--rx", "0deg");
    card.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <button
      ref={card}
      type="button"
      className="os-stats"
      aria-label="At a glance. Open Work"
      onClick={onOpen}
      onPointerMove={tilt}
      onPointerLeave={reset}
    >
      <span className="os-stats-title">At a glance</span>
      <span className="os-stats-grid">
        <Stat
          value={new Date().getFullYear() - since}
          label="years shipping"
          run={run}
        />
        <Stat value={data.projects.length} label="projects" run={run} />
        <Stat
          value={data.github?.repositories ?? 0}
          label="public repos"
          run={run}
        />
        <Stat value={data.experiences.length} label="roles" run={run} />
      </span>
    </button>
  );
}
