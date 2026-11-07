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
