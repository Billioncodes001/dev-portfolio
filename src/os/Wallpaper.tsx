import { useEffect, useRef, useState } from "react";

const TALL = "(max-aspect-ratio: 1/1)";

/**
 * Wallpaper: a 10-second "ready for work" loop, cut tall for phones and wide
 * for desktops. The poster paints first; the video is skipped for reduced
 * motion and Save-Data, pauses while the tab is hidden, and retries on the
 * first tap when the browser refuses to autoplay (iOS Low Power Mode).
 */
export default function Wallpaper() {
  const video = useRef<HTMLVideoElement>(null);
  const [tall, setTall] = useState(() => window.matchMedia(TALL).matches);
  const still =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true;
  const name = tall ? "morning-tall" : "morning-wide";

  useEffect(() => {
    const media = window.matchMedia(TALL);
    const update = () => setTall(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const play = () => void el.play().catch(() => undefined);
    const sync = () => (document.hidden ? el.pause() : play());
    const retry = () => {
      if (el.paused && !document.hidden) play();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pointerdown", retry);
    window.addEventListener("touchstart", retry, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("touchstart", retry);
    };
  }, [name]);

  // Depth: the wallpaper drifts against the pointer (or the phone's tilt
  // where the browser offers it without a permission prompt), so the desktop
  // reads as layers rather than a flat picture.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // A critically damped follow: each frame closes part of the gap to the
    // target, and the loop sleeps once everything has settled. Only
    // transforms change, so nothing relayouts.
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let frame = 0;
    const layers: [string, number, number, string][] = [
      [".os-wallpaper video, .os-wallpaper img", -24, -18, "scale(1.07)"],
    ];
    const step = () => {
      now.x += (target.x - now.x) * 0.09;
      now.y += (target.y - now.y) * 0.09;
      for (const [sel, kx, ky, extra] of layers)
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const t = `${(now.x * kx).toFixed(2)}px ${(now.y * ky).toFixed(2)}px`;
          if (extra)
            el.style.transform = `translate3d(${t.replace(" ", ", ")}, 0) ${extra}`;
          else el.style.translate = t;
        }
      const settled =
        Math.abs(target.x - now.x) < 0.001 &&
        Math.abs(target.y - now.y) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const set = (x: number, y: number) => {
      target.x = x;
      target.y = y;
      if (!frame) frame = requestAnimationFrame(step);
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      set(
        event.clientX / window.innerWidth - 0.5,
        event.clientY / window.innerHeight - 0.5,
      );
    };
    const tilt = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      set(
        Math.max(-1, Math.min(1, event.gamma / 30)) / 2,
        Math.max(-1, Math.min(1, (event.beta - 45) / 30)) / 2,
      );
    };
    const needsPermission =
      !("DeviceOrientationEvent" in window) ||
      typeof (
        DeviceOrientationEvent as unknown as { requestPermission?: unknown }
      ).requestPermission === "function";
    window.addEventListener("pointermove", pointer);
    if (!needsPermission) window.addEventListener("deviceorientation", tilt);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("deviceorientation", tilt);
    };
  }, []);

  return (
    <div className="os-wallpaper" aria-hidden="true">
      {still ? (
        <img src={`/media/${name}-poster.webp`} alt="" />
      ) : (
        <video
          key={name}
          ref={video}
          poster={`/media/${name}-poster.webp`}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
        >
          <source src={`/media/${name}.webm`} type="video/webm" />
          <source src={`/media/${name}.mp4`} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
