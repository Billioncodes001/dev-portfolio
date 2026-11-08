import { useEffect, useRef } from "react";
import { unlock } from "../secrets";
import type { Button, Pad } from "./input";

/**
 * Bug Squash: a tiny platformer on the pocket console. Run right through a
 * Lagos night, stomp bugs from above, collect the sparks, and reach the
 * deploy flag. Touching a bug from the side costs a heart.
 */
const W = 160;
const H = 180;
const GROUND = 160;
const END = 1480;
const INK = "#0f380f";
const MID = "#306230";
const LIGHT = "#8bac0f";
const PAPER = "#cadc9f";

type Box = { x: number; y: number; w: number; h: number };
type Bug = {
  x: number;
  y: number;
  dir: number;
  min: number;
  max: number;
  dead: number;
};
type Spark = { x: number; y: number; got: boolean };

const BLOCKS: Box[] = [
  { x: 150, y: 140, w: 28, h: 20 },
  { x: 260, y: 124, w: 40, h: 36 },
  { x: 380, y: 112, w: 22, h: 10 },
  { x: 430, y: 96, w: 22, h: 10 },
  { x: 520, y: 132, w: 60, h: 28 },
  { x: 680, y: 118, w: 34, h: 42 },
  { x: 790, y: 104, w: 24, h: 10 },
  { x: 850, y: 88, w: 24, h: 10 },
  { x: 960, y: 136, w: 70, h: 24 },
  { x: 1110, y: 120, w: 30, h: 40 },
  { x: 1220, y: 106, w: 22, h: 10 },
  { x: 1300, y: 132, w: 50, h: 28 },
];
const level = () => ({
  bugs: [
    [210, 250],
    [330, 500],
    [600, 670],
    [720, 940],
    [1040, 1100],
    [1150, 1290],
    [1360, 1460],
  ].map(([min, max]): Bug => ({
    x: min,
    y: GROUND - 6,
    dir: 1,
    min,
    max,
    dead: 0,
  })),
  sparks: [
    [164, 128],
    [276, 110],
    [386, 98],
    [436, 82],
    [548, 118],
    [640, 148],
    [696, 104],
    [796, 90],
    [856, 74],
    [990, 122],
    [1120, 106],
    [1226, 92],
    [1318, 118],
    [1420, 148],
    [1000, 148],
    [460, 148],
  ].map(([x, y]): Spark => ({ x, y, got: false })),
});

// 8×8 sprites, one character per pixel: . clear, # ink, + mid, o light.
const ROBOT = [
  "..####..",
  ".#oooo#.",
  ".#o#o##.",
  ".#oooo#.",
  "..####..",
  ".#++++#.",
  ".#++++#.",
  "..#..#..",
];
const BUG = [
  "..#..#..",
  "...##...",
  ".######.",
  "#++++++#",
  ".######.",
  "#.#..#.#",
];
const BUG2 = [
  "..#..#..",
  "...##...",
  ".######.",
  "#++++++#",
  ".######.",
  ".#.##.#.",
];

function sprite(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  flip = false,
) {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c === ".") return;
      ctx.fillStyle = c === "#" ? INK : c === "+" ? MID : LIGHT;
      ctx.fillRect(
        Math.round(x + (flip ? row.length - 1 - i : i)),
        Math.round(y + j),
        1,
        1,
      );
    }),
  );
}

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size = 8,
  color = INK,
  align: CanvasTextAlign = "center",
) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

export default function BugSquash({
  pad,
  onLeave,
}: {
  pad: Pad;
  onLeave: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const leave = useRef(onLeave);
  leave.current = onLeave;

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    let mode: "title" | "play" | "won" | "lost" = "title";
    let p = {
      x: 20,
      y: GROUND - 8,
      vx: 0,
      vy: 0,
      ground: true,
      face: 1,
      hurt: 0,
    };
    let world = level();
    let hearts = 3;
    let stomped = 0;
    let frames = 0;
    let camera = 0;
    let tick = 0;

    const reset = () => {
      p = {
        x: 20,
        y: GROUND - 8,
        vx: 0,
        vy: 0,
        ground: true,
        face: 1,
        hurt: 0,
      };
      world = level();
      hearts = 3;
      stomped = 0;
      frames = 0;
      camera = 0;
    };
    const off = pad.subscribe((b: Button) => {
      if (b === "b") {
        if (mode === "play") mode = "title";
        else leave.current();
        return;
      }
      if (b !== "a") return;
      if (mode !== "play") {
        reset();
        mode = "play";
      } else if (p.ground) {
        p.vy = -4.6;
        p.ground = false;
      }
    });

    const solid = (x: number, y: number, w: number, h: number) =>
      BLOCKS.find(
        (b) => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y,
      );

    const step = () => {
      tick++;
      if (mode !== "play") return;
      frames++;
      const dir =
        (pad.held.has("right") ? 1 : 0) - (pad.held.has("left") ? 1 : 0);
      p.vx = dir * 1.5;
      if (dir) p.face = dir;
      // Horizontal, then vertical, so blocks behave like walls and floors.
      p.x = Math.max(0, Math.min(END + 20, p.x + p.vx));
      const wall = solid(p.x, p.y, 8, 8);
      if (wall) p.x = p.vx > 0 ? wall.x - 8 : wall.x + wall.w;
      p.vy = Math.min(4, p.vy + 0.25);
      p.y += p.vy;
      p.ground = false;
      const floor = solid(p.x, p.y, 8, 8);
      if (floor) {
        if (p.vy > 0) {
          p.y = floor.y - 8;
          p.ground = true;
        } else p.y = floor.y + floor.h;
        p.vy = 0;
      }
      if (p.y >= GROUND - 8) {
        p.y = GROUND - 8;
        p.vy = 0;
        p.ground = true;
      }
      if (p.hurt) p.hurt--;

      for (const bug of world.bugs) {
        if (bug.dead) {
          bug.dead++;
          continue;
        }
        bug.x += bug.dir * 0.5;
        if (bug.x < bug.min || bug.x > bug.max || solid(bug.x, bug.y, 8, 6)) {
          bug.dir *= -1;
          bug.x += bug.dir * 1;
        }
        const hit =
          p.x < bug.x + 8 &&
          p.x + 8 > bug.x &&
          p.y < bug.y + 6 &&
          p.y + 8 > bug.y;
        if (!hit) continue;
        if (p.vy > 0 && p.y + 8 - bug.y < 5) {
          bug.dead = 1;
          stomped++;
          p.vy = -3;
        } else if (!p.hurt) {
          hearts--;
          p.hurt = 70;
          p.vy = -2.5;
          p.x -= p.face * 10;
          if (hearts <= 0) mode = "lost";
        }
      }
      for (const s of world.sparks)
        if (
          !s.got &&
          Math.abs(p.x + 4 - s.x) < 6 &&
          Math.abs(p.y + 4 - s.y) < 7
        )
          s.got = true;
      if (p.x >= END) {
        mode = "won";
        unlock("arcade");
      }
      camera = Math.max(0, Math.min(END + 40 - W, p.x - 60));
    };

    const draw = () => {
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      // Night skyline drifting at half speed, Third Mainland Bridge included.
      ctx.fillStyle = LIGHT;
      for (let i = 0; i < 40; i++) {
        const bx = i * 46 - ((camera * 0.5) % 46) - 46;
        const bh = 24 + ((i * 37) % 40);
        ctx.fillRect(bx, GROUND - bh - 10, 30, bh + 10);
        ctx.fillStyle = PAPER;
        for (let wy = GROUND - bh - 4; wy < GROUND - 14; wy += 7)
          for (let wx = bx + 4; wx < bx + 26; wx += 7)
            if ((wx + wy + i) % 3) ctx.fillRect(wx, wy, 2, 3);
        ctx.fillStyle = LIGHT;
      }
      ctx.fillStyle = MID;
      ctx.fillRect(0, GROUND - 22 - ((camera * 0.3) % 1), W, 2);
      for (let i = 0; i < 12; i++)
        ctx.fillRect(i * 20 - ((camera * 0.3) % 20), GROUND - 20, 2, 20);
      ctx.save();
      ctx.translate(-Math.round(camera), 0);
      ctx.fillStyle = INK;
      ctx.fillRect(camera - 2, GROUND, W + 4, H - GROUND);
      for (const b of BLOCKS) {
        ctx.fillStyle = INK;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = MID;
        ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, 2);
      }
      // The deploy flag.
      ctx.fillStyle = INK;
      ctx.fillRect(END + 8, GROUND - 40, 2, 40);
      ctx.fillStyle = MID;
      ctx.fillRect(END + 10, GROUND - 40, 14, 9);
      text(ctx, "▲", END + 17, GROUND - 32, 7, PAPER);
      for (const s of world.sparks) {
        if (s.got) continue;
        ctx.fillStyle = tick % 30 < 15 ? INK : MID;
        ctx.fillRect(s.x - 1, s.y - 3, 2, 6);
        ctx.fillRect(s.x - 3, s.y - 1, 6, 2);
      }
      for (const bug of world.bugs) {
        if (bug.dead > 20) continue;
        if (bug.dead) {
          ctx.fillStyle = INK;
          ctx.fillRect(bug.x, bug.y + 4, 8, 2);
          continue;
        }
        sprite(ctx, tick % 16 < 8 ? BUG : BUG2, bug.x, bug.y, bug.dir < 0);
      }
      if (!(p.hurt && tick % 6 < 3)) sprite(ctx, ROBOT, p.x, p.y, p.face < 0);
      ctx.restore();

      // HUD
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, 12);
      text(
        ctx,
        "♥".repeat(Math.max(0, hearts)) + "♡".repeat(3 - Math.max(0, hearts)),
        4,
        9,
        8,
        PAPER,
        "left",
      );
      const got = world.sparks.filter((s) => s.got).length;
      text(ctx, `✦ ${got}/${world.sparks.length}`, W / 2, 9, 8, PAPER);
      const secs = Math.floor(frames / 60);
      text(
        ctx,
        `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`,
        W - 4,
        9,
        8,
        PAPER,
        "right",
      );

      if (mode !== "play") {
        ctx.fillStyle = "rgba(202,220,159,0.92)";
        ctx.fillRect(10, 34, W - 20, 96);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 34, W - 20, 96);
        if (mode === "title") {
          text(ctx, "BUG", W / 2, 60, 20);
          text(ctx, "SQUASH", W / 2, 80, 14);
          text(ctx, "STOMP BUGS. SHIP CODE.", W / 2, 96, 7, MID);
          text(ctx, "A START   B LEAVE", W / 2, 118, 8);
        } else {
          text(
            ctx,
            mode === "won" ? "SHIPPED!" : "PROD IS DOWN",
            W / 2,
            62,
            13,
          );
          text(ctx, `${stomped} bugs squashed`, W / 2, 82, 8, MID);
          text(
            ctx,
            `${got}/${world.sparks.length} sparks · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`,
            W / 2,
            96,
            8,
            MID,
          );
          text(ctx, "A AGAIN   B LEAVE", W / 2, 118, 8);
        }
      }
    };

    let frame = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      while (acc >= 1000 / 60) {
        step();
        acc -= 1000 / 60;
      }
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      off();
    };
  }, [pad]);

  return (
    <canvas
      ref={canvas}
      className="pocket-game"
      width={W}
      height={H}
      role="img"
      aria-label="Bug Squash. Left and right to run, A to jump, B to leave."
    />
  );
}
