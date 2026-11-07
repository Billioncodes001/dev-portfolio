import { useEffect, useRef } from "react";

/**
 * Desktop wallpaper: a seamless Lagos-at-dusk video loop. The poster paints
 * first; the video is skipped for reduced motion and Save-Data, and pauses
 * while the tab is hidden.
 */
export default function Wallpaper() {
  const video = useRef<HTMLVideoElement>(null);
  const still =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true;
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const sync = () => {
      if (document.hidden) el.pause();
      else void el.play().catch(() => undefined);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return (
    <div className="os-wallpaper" aria-hidden="true">
      {still ? (
        <img src="/media/wallpaper-poster.webp" alt="" />
      ) : (
        <video
          ref={video}
          poster="/media/wallpaper-poster.webp"
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
        >
          <source src="/media/wallpaper.webm" type="video/webm" />
          <source src="/media/wallpaper.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}
