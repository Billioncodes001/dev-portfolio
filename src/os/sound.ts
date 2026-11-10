import { useSyncExternalStore } from "react";

/**
 * Background music. Browsers only allow audio after a user gesture, so the
 * track starts when the visitor unlocks (or on their first tap after a deep
 * link). The mute choice is remembered per browser.
 */
const SRC = "/media/amapiano-loop.mp3";
const KEY = "ja-os-sound";
const VOLUME = 0.32;

let audio: HTMLAudioElement | null = null;
let enabled = readPref();
let playing = false;
let started = false;
let fade = 0;
const listeners = new Set<() => void>();

function readPref() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
function emit() {
  for (const listener of listeners) listener();
}
function element() {
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0;
    audio.addEventListener("play", () => {
      playing = true;
      emit();
    });
    audio.addEventListener("pause", () => {
      playing = false;
      emit();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) audio?.pause();
      else if (enabled && started) void play();
    });
  }
  return audio;
}

function ramp(target: number, done?: () => void) {
  cancelAnimationFrame(fade);
  const el = element();
  const from = el.volume;
  const begin = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - begin) / 900);
    // Float rounding can land a hair outside 0–1, which browsers reject.
    el.volume = Math.min(1, Math.max(0, from + (target - from) * t));
    if (t < 1) fade = requestAnimationFrame(step);
    else done?.();
  };
  fade = requestAnimationFrame(step);
}

async function play() {
  const el = element();
  try {
    await el.play();
    ramp(VOLUME);
  } catch {
    /* Blocked until a gesture; the next tap retries. */
  }
}

export const sound = {
  /** Call from a user gesture (unlock, first tap). */
  start() {
    started = true;
    if (enabled && !playing) void play();
  },
  toggle() {
    enabled = !enabled;
    try {
      localStorage.setItem(KEY, enabled ? "on" : "off");
    } catch {
      /* Preference is optional. */
    }
    if (enabled) {
      started = true;
      void play();
    } else ramp(0, () => element().pause());
    emit();
  },
  stop() {
    if (audio && playing) ramp(0, () => audio?.pause());
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
let snapshot = { enabled, playing };
const getSnapshot = () => {
  if (snapshot.enabled !== enabled || snapshot.playing !== playing)
    snapshot = { enabled, playing };
  return snapshot;
};

export function useSound() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
