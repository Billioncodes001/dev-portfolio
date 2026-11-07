import { useEffect, useRef } from "react";

/**
 * A living dot-matrix field: slow interference waves ripple across a grid of
 * dots and the pointer lights up a lime halo. Draws a single still frame when
 * the visitor prefers reduced motion, and pauses while the tab is hidden.
 */
export default function Wallpaper() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gap = 22;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let width = 0;
    let height = 0;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = width * ratio;
      el.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time: number) => {
      const t = time / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      ctx.clearRect(0, 0, width, height);
      for (let y = gap / 2; y < height; y += gap) {
        for (let x = gap / 2; x < width; x += gap) {
          const wave =
            Math.sin(x * 0.011 + t * 0.6) +
            Math.sin(y * 0.014 - t * 0.45) +
            Math.sin((x + y) * 0.006 + t * 0.3);
          const level = (wave + 3) / 6;
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 190);
          const size = 0.7 + level * 1.5 + glow * 2.2;
          ctx.fillStyle =
            glow > 0.02
              ? `rgba(215, 237, 145, ${0.18 + glow * 0.75})`
              : `rgba(215, 237, 145, ${0.05 + level * 0.16})`;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
    };
    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };
    const move = (event: PointerEvent) => {
      pointer.tx = event.clientX;
      pointer.ty = event.clientY;
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !still) frame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    if (still) draw(0);
    else {
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("visibilitychange", visibility);
      frame = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <div className="os-wallpaper" aria-hidden="true">
      <div className="os-wallpaper-glow" />
      <canvas ref={canvas} />
      <div className="os-wallpaper-mark">
        ja<span>.</span>
      </div>
    </div>
  );
}
