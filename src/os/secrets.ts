import { useSyncExternalStore } from "react";

/**
 * A small treasure hunt: secrets hidden around JA/OS. Finds are remembered
 * per browser, and each new one raises a notification.
 */
export const SECRETS = [
  { id: "konami", title: "Old-school", hint: "↑ ↑ ↓ ↓ ← → ← → B A" },
  {
    id: "sudo",
    title: "Root access",
    hint: "Ask the terminal nicely, as root",
  },
  {
    id: "logo",
    title: "Logo masher",
    hint: "The ja. mark in the menu bar, five times",
  },
  {
    id: "arcade",
    title: "Shipped it",
    hint: "Reach the deploy flag in Bug Squash",
  },
  {
    id: "chat",
    title: "Confidant",
    hint: "Ask Josiah for a secret in Messages",
  },
  {
    id: "sysinfo",
    title: "Spec sheet",
    hint: "Check what this machine runs on",
  },
  { id: "lost", title: "Off the map", hint: "Visit a page that doesn't exist" },
] as const;

export type SecretId = (typeof SECRETS)[number]["id"];

const KEY = "ja-os-secrets";
let found = read();
let latest: SecretId | null = null;
const listeners = new Set<() => void>();

function read(): SecretId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw)
      ? SECRETS.map((s) => s.id).filter((id) => raw.includes(id))
      : [];
  } catch {
    return [];
  }
}

export function unlock(id: SecretId) {
  if (found.includes(id)) return;
  found = [...found, id];
  latest = id;
  try {
    localStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    /* Progress is optional. */
  }
  for (const listener of listeners) listener();
}

export function dismissLatest() {
  latest = null;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
let snapshot: { found: SecretId[]; latest: SecretId | null } = {
  found,
  latest,
};
const getSnapshot = () => {
  if (snapshot.found !== found || snapshot.latest !== latest)
    snapshot = { found, latest };
  return snapshot;
};

export function useSecrets() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
