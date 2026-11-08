import { useEffect, useState } from "react";
import type { AppId } from "./apps";
import { reducedMotion } from "./util";

/** The easing curves every JA/OS motion uses; os.css mirrors them as tokens. */
export const EASE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  in: "cubic-bezier(0.64, 0, 0.78, 0)",
  spring: "cubic-bezier(0.34, 1.32, 0.64, 1)",
};

// Remember which icon launched an app, so its window can grow out of it.
let launch: { app: string; rect: DOMRect; at: number } | null = null;
if (typeof window !== "undefined")
  window.addEventListener(
    "pointerdown",
    (event) => {
      const el = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-app]",
      );
      if (el?.dataset.app)
        launch = {
          app: el.dataset.app,
          rect: (el.querySelector(".app-icon") ?? el).getBoundingClientRect(),
          at: performance.now(),
        };
    },
    true,
  );

/** The icon rect that just launched this app, if it was tapped a moment ago. */
export function takeLaunch(app: AppId) {
  const hit =
    launch && launch.app === app && performance.now() - launch.at < 1500;
  const rect = hit ? launch!.rect : null;
  if (hit) launch = null;
  return rect;
}

/** Where an app's icon sits on screen right now (dock first), if anywhere. */
export function iconRect(app: AppId) {
  for (const el of document.querySelectorAll<HTMLElement>(
    `.os-dock [data-app="${app}"], .ios-home [data-app="${app}"], .os-icons [data-app="${app}"]`,
  )) {
    const r = (el.querySelector(".app-icon") ?? el).getBoundingClientRect();
    if (r.width > 0) return r;
  }
  return null;
}

/**
 * Zoom an element between its own box and an icon's box, in or out. Uses
 * transforms only, so the browser composites it without relayout.
 */
export function zoom(el: HTMLElement, icon: DOMRect, dir: "in" | "out") {
  if (reducedMotion()) return null;
  const box = el.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  const dx = icon.left + icon.width / 2 - (box.left + box.width / 2);
  const dy = icon.top + icon.height / 2 - (box.top + box.height / 2);
  const small = {
    transform: `translate(${dx}px, ${dy}px) scale(${icon.width / box.width}, ${icon.height / box.height})`,
    opacity: 0,
    borderRadius: "40px",
    visibility: "visible",
  };
  const full = {
    transform: "none",
    opacity: 1,
    borderRadius: getComputedStyle(el).borderRadius,
    visibility: "visible",
  };
  return el.animate(
    dir === "in"
      ? [small, { opacity: 1, offset: 0.35 }, full]
      : [full, { opacity: 1, offset: 0.6 }, small],
    {
      duration: dir === "in" ? 440 : 380,
      easing: dir === "in" ? EASE.out : EASE.inOut,
    },
  );
}

/** FLIP: animate from an old box to the element's current box. */
export function flip(el: HTMLElement, from: DOMRect) {
  if (reducedMotion()) return;
  const to = el.getBoundingClientRect();
  if (!to.width || !to.height) return;
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  if (Math.abs(dx) + Math.abs(dy) + Math.abs(1 - sx) + Math.abs(1 - sy) < 0.5)
    return;
  el.animate(
    [
      {
        transformOrigin: "0 0",
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
      },
      { transformOrigin: "0 0", transform: "none" },
    ],
    { duration: 380, easing: EASE.out },
  );
}

/**
 * Keeps something mounted for `ms` after it is hidden, so it can animate out.
 * Returns whether to render it and whether it is on its way out.
 */
export function useExit(show: boolean, ms: number) {
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show) return setMounted(true);
    const t = setTimeout(() => setMounted(false), reducedMotion() ? 0 : ms);
    return () => clearTimeout(t);
  }, [show, ms]);
  return { mounted: show || mounted, leaving: !show && mounted };
}
