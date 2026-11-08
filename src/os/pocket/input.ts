export type Button = "up" | "down" | "left" | "right" | "a" | "b";

/**
 * The console's controller. Screens subscribe to presses; the game also reads
 * which buttons are held. Keyboard keys and the on-screen buttons both feed it.
 */
export type Pad = {
  held: Set<Button>;
  press: (b: Button) => void;
  down: (b: Button) => void;
  up: (b: Button) => void;
  subscribe: (fn: (b: Button) => void) => () => void;
};

export function createPad(onPress?: (b: Button) => void): Pad {
  const listeners = new Set<(b: Button) => void>();
  const held = new Set<Button>();
  const press = (b: Button) => {
    onPress?.(b);
    for (const fn of [...listeners]) fn(b);
  };
  return {
    held,
    press,
    down: (b) => {
      if (!held.has(b)) press(b);
      held.add(b);
    },
    up: (b) => held.delete(b),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** Arrows or WASD move, X/Space/Enter is A, Z/Escape/Backspace is B. */
export function keyButton(key: string): Button | null {
  const k = key.length === 1 ? key.toLowerCase() : key;
  const map: Record<string, Button> = {
    ArrowUp: "up",
    w: "up",
    ArrowDown: "down",
    s: "down",
    ArrowLeft: "left",
    a: "left",
    ArrowRight: "right",
    d: "right",
    x: "a",
    " ": "a",
    Enter: "a",
    z: "b",
    Escape: "b",
    Backspace: "b",
  };
  return map[k] ?? null;
}
