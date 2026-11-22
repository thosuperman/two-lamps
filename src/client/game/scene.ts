// Canvas renderer for the Two Lamps plaza: two plaster walls, two lanterns,
// a tiled plot and stacked blocks, drawn isometrically back to front.
import { views, type Grid, type Rules } from '../../shared/engine.ts';

export type Cell = { i: number; j: number };

export type Spark = { x: number; y: number; vx: number; vy: number; life: number; size: number };

export type SceneState = {
  puzzle: Rules;
  h: Grid<number>;
  hover: Cell | null;
  hintTile: Cell | null;
  drop: (Cell & { t0: number }) | null;
  shake: (Cell & { t0: number }) | null;
  /** performance.now() of the latest solve, for the celebration. */
  solvedAt: number | null;
  /** Windows lit (the build currently matches). */
  lit: boolean;
  sparks: Spark[];
};

export type Layout = {
  W: number;
  H: number;
  n: number;
  Hw: number;
  tw: number;
  th: number;
  bh: number;
  ox: number;
  oy: number;
};

const C = {
  wall: '#f3ddb0',
  wallTop: '#ead0a0',
  wallLine: 'rgba(122, 82, 44, 0.13)',
  wallEdge: 'rgba(58, 34, 18, 0.55)',
  shadow: '#2a2040',
  matchShadow: '#3b2a24',
  target: '#7c5634',
  gold: '#ffc94a',
  ember: '#ff9b42',
  coral: '#ef5b45',
  tileA: '#54476e',
  tileB: '#4d4166',
  tileEdge: 'rgba(16, 10, 28, 0.35)',
  top: ['#f6e7cb', '#f8ecd6', '#faf1e0', '#fcf5ea', '#fef9f2', '#ffffff'],
  left: '#d99a63',
  right: '#b26e43',
  blockEdge: 'rgba(60, 30, 14, 0.55)',
  window: '#ffd57e',
};

export const computeLayout = (W: number, H: number, n: number, Hw: number, padTop: number, padBottom: number): Layout => {
  const m = Math.max(10, W * 0.03);
  const k = 0.5 * n + 0.6 * Hw + 0.45;
  const tw = Math.max(8, Math.min((W - 2 * m) / n, (H - padTop - padBottom) / k));
  const th = tw * 0.5;
  const bh = tw * 0.6;
  const used = tw * k;
  const oy = padTop + Math.max(0, (H - padTop - padBottom - used) / 2) + (Hw + 0.45) * bh;
  return { W, H, n, Hw, tw, th, bh, ox: W / 2, oy };
};

export const wallHeight = (p: Rules): number => Math.max(...p.R, ...p.C) + 1;

type Pt = [number, number];

const project = (L: Layout, x: number, y: number, z: number): Pt => [
  L.ox + ((x - y) * L.tw) / 2,
  L.oy + ((x + y) * L.th) / 2 - z * L.bh,
];

const poly = (ctx: CanvasRenderingContext2D, pts: Pt[]) => {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};

const inPoly = (x: number, y: number, pts: Pt[]): boolean => {
  let c = false;
  for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
    const [xa, ya] = pts[a]!;
    const [xb, yb] = pts[b]!;
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) c = !c;
  }
  return c;
};

/** Screen outline of the stack at row i, column j (x = j, y = i). */
const prism = (L: Layout, i: number, j: number, k: number): Pt[] => [
  project(L, j, i, k),
  project(L, j + 1, i, k),
  project(L, j + 1, i, 0),
  project(L, j + 1, i + 1, 0),
  project(L, j, i + 1, 0),
  project(L, j, i + 1, k),
];

export const cellAt = (L: Layout, h: Grid<number>, x: number, y: number): Cell | null => {
  const n = h.length;
  const cells: Cell[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push({ i, j });
  cells.sort((a, b) => b.i + b.j - (a.i + a.j));
  for (const c of cells) if (inPoly(x, y, prism(L, c.i, c.j, h[c.i]?.[c.j] ?? 0))) return c;
  return null;
};

/** Screen positions of the two lanterns (front-left lights the right wall and vice versa). */
export const lampPoints = (L: Layout): Pt[] => [
  project(L, L.n * 0.5, L.n + 0.7, 0),
  project(L, L.n + 0.7, L.n * 0.5, 0),
];

const tileShade = (i: number, j: number): string => {
  const r = ((i * 73 + j * 151) % 17) / 17;
  return (i + j) % 2 ? shadeMix(C.tileA, r * 0.08) : shadeMix(C.tileB, r * 0.08);
};

const shadeMix = (hex: string, amt: number): string => {
  const v = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.min(255, Math.round(((v >> s) & 255) * (1 + amt)));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

const drawWall = (
  ctx: CanvasRenderingContext2D,
  L: Layout,
  side: 'R' | 'C',
  targets: number[],
  cur: number[],
  glow: number,
  t: number
) => {
  const { n, Hw } = L;
  const W = side === 'C' ? (u: number, z: number) => project(L, u, 0, z) : (u: number, z: number) => project(L, 0, u, z);
  const quad = (a: number, b: number, z0: number, z1: number): Pt[] => [W(a, z0), W(b, z0), W(b, z1), W(a, z1)];

  // Plaster with a pool of lamplight.
  poly(ctx, quad(0, n, 0, Hw));
  const [bx, by] = W(0, 0);
  const [tx, ty] = W(0, Hw);
  const lin = ctx.createLinearGradient(bx, by, tx, ty);
  lin.addColorStop(0, C.wall);
  lin.addColorStop(1, C.wallTop);
  ctx.fillStyle = lin;
  ctx.fill();
  const [cx, cy] = W(n / 2, Hw * 0.42);
  const flick = 0.92 + 0.08 * Math.sin(t / 310 + (side === 'R' ? 0 : 2));
  const rad = ctx.createRadialGradient(cx, cy, 2, cx, cy, n * L.tw * 0.62);
  rad.addColorStop(0, `rgba(255, 238, 196, ${0.55 * flick})`);
  rad.addColorStop(1, 'rgba(255, 238, 196, 0)');
  ctx.fillStyle = rad;
  ctx.fill();
  if (side === 'R') {
    ctx.fillStyle = 'rgba(70, 36, 12, 0.10)';
    ctx.fill();
  }
  // Faint courses of plaster so heights can be counted.
  ctx.strokeStyle = C.wallLine;
  ctx.lineWidth = 1;
  for (let z = 1; z < Hw; z++) {
    ctx.beginPath();
    ctx.moveTo(...W(0, z));
    ctx.lineTo(...W(n, z));
    ctx.stroke();
  }
  for (let u = 1; u < n; u++) {
    ctx.beginPath();
    ctx.moveTo(...W(u, 0));
    ctx.lineTo(...W(u, Hw));
    ctx.stroke();
  }

  // Target silhouette: faint fill plus one dashed outline.
  const outline: Pt[] = [W(0, 0)];
  for (let k = 0; k < n; k++) {
    const h = targets[k] ?? 0;
    outline.push(W(k, h), W(k + 1, h));
  }
  outline.push(W(n, 0));
  poly(ctx, outline);
  ctx.fillStyle = 'rgba(42, 32, 64, 0.08)';
  ctx.fill();

  // Cast shadows, column by column.
  for (let k = 0; k < n; k++) {
    const tk = targets[k] ?? 0;
    const ck = cur[k] ?? 0;
    const s = Math.min(ck, tk);
    if (s > 0) {
      poly(ctx, quad(k, k + 1, 0, s));
      ctx.fillStyle = ck === tk ? C.matchShadow : C.shadow;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (ck > tk) {
      poly(ctx, quad(k, k + 1, tk, ck));
      ctx.fillStyle = C.coral;
      ctx.fill();
      ctx.save();
      poly(ctx, quad(k, k + 1, tk, ck));
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let d = -2; d < 6; d += 0.32) {
        ctx.beginPath();
        ctx.moveTo(...W(k + d, tk));
        ctx.lineTo(...W(k + d + 1.2, ck));
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -t / 60;
  ctx.strokeStyle = C.target;
  ctx.lineWidth = 2;
  ctx.beginPath();
  outline.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();

  // Matched columns get a gold rim.
  for (let k = 0; k < n; k++) {
    const tk = targets[k] ?? 0;
    if ((cur[k] ?? 0) !== tk || tk === 0) continue;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(255, 201, 74, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(...W(k, tk));
    ctx.lineTo(...W(k + 1, tk));
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  if (glow > 0) {
    poly(ctx, quad(0, n, 0, Hw));
    ctx.fillStyle = `rgba(255, 201, 74, ${0.35 * glow})`;
    ctx.fill();
  }
  poly(ctx, quad(0, n, 0, Hw));
  ctx.strokeStyle = C.wallEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Wall cap.
  ctx.strokeStyle = '#fff1d2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(...W(0, Hw));
  ctx.lineTo(...W(n, Hw));
  ctx.stroke();

  // Status lights above each column: gold = match, coral = too tall, hollow = short.
  for (let k = 0; k < n; k++) {
    const tk = targets[k] ?? 0;
    const ck = cur[k] ?? 0;
    const [px, py] = W(k + 0.5, Hw + 0.32);
    const r = Math.max(3.5, L.tw * 0.065);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    if (ck === tk) {
      ctx.fillStyle = C.gold;
      ctx.shadowColor = 'rgba(255, 201, 74, 0.9)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (ck > tk) {
      ctx.fillStyle = C.coral;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(246, 234, 215, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
};

const drawTile = (ctx: CanvasRenderingContext2D, L: Layout, s: SceneState, i: number, j: number, t: number) => {
  const x = j;
  const y = i;
  const top: Pt[] = [project(L, x, y, 0), project(L, x + 1, y, 0), project(L, x + 1, y + 1, 0), project(L, x, y + 1, 0)];
  poly(ctx, top);
  ctx.fillStyle = tileShade(i, j);
  ctx.fill();
  ctx.strokeStyle = C.tileEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Bevel highlight on the back edges.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.moveTo(...project(L, x + 0.06, y + 0.94, 0));
  ctx.lineTo(...project(L, x + 0.06, y + 0.06, 0));
  ctx.lineTo(...project(L, x + 0.94, y + 0.06, 0));
  ctx.stroke();

  if (s.puzzle.top?.[i]?.[j]) {
    // A pool of light from the third lamp above.
    const [cx, cy] = project(L, x + 0.5, y + 0.5, 0);
    const pulse = 0.85 + 0.15 * Math.sin(t / 500 + i + j);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.5);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, L.tw * 0.42);
    g.addColorStop(0, `rgba(255, 214, 120, ${0.8 * pulse})`);
    g.addColorStop(0.7, `rgba(255, 200, 100, ${0.35 * pulse})`);
    g.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, L.tw * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 201, 74, ${0.75 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, L.tw * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (s.hintTile && s.hintTile.i === i && s.hintTile.j === j) {
    const k = 0.5 + 0.5 * Math.sin(t / 220);
    poly(ctx, top);
    ctx.strokeStyle = `rgba(255, 201, 74, ${0.35 + 0.65 * k})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
};

const drawRock = (ctx: CanvasRenderingContext2D, L: Layout, i: number, j: number) => {
  const [cx, cy] = project(L, j + 0.5, i + 0.5, 0);
  const rw = L.tw * 0.3;
  const rh = L.th * 0.44;
  ctx.fillStyle = 'rgba(10, 6, 20, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + rh * 0.35, rw * 1.05, rh * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(cx - rw, cy - rh * 1.6, cx + rw, cy + rh * 0.5);
  g.addColorStop(0, '#a9a3b6');
  g.addColorStop(1, '#5e586c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - rw, cy + rh * 0.25);
  ctx.quadraticCurveTo(cx - rw * 0.95, cy - rh * 1.5, cx - rw * 0.15, cy - rh * 1.65);
  ctx.quadraticCurveTo(cx + rw * 0.95, cy - rh * 1.5, cx + rw, cy + rh * 0.25);
  ctx.quadraticCurveTo(cx, cy + rh * 0.95, cx - rw, cy + rh * 0.25);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx - rw * 0.3, cy - rh * 0.95, rw * 0.28, rh * 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();
};

const drawCube = (
  ctx: CanvasRenderingContext2D,
  L: Layout,
  x: number,
  y: number,
  z: number,
  level: number,
  wrong: boolean,
  windowLight: number
) => {
  const P = (a: number, b: number, c: number) => project(L, a, b, c);
  const top: Pt[] = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
  const left: Pt[] = [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
  const right: Pt[] = [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)];
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.blockEdge;
  poly(ctx, left);
  ctx.fillStyle = C.left;
  ctx.fill();
  ctx.stroke();
  poly(ctx, right);
  ctx.fillStyle = C.right;
  ctx.fill();
  ctx.stroke();
  poly(ctx, top);
  ctx.fillStyle = wrong ? '#f4a08c' : (C.top[Math.min(level, C.top.length - 1)] ?? '#fff');
  ctx.fill();
  ctx.stroke();
  // Soft highlight on the front edges.
  ctx.strokeStyle = 'rgba(255, 250, 235, 0.45)';
  ctx.beginPath();
  ctx.moveTo(...P(x, y + 1, z + 1));
  ctx.lineTo(...P(x + 1, y + 1, z + 1));
  ctx.lineTo(...P(x + 1, y, z + 1));
  ctx.stroke();

  if (windowLight > 0) {
    const win = (pts: Pt[]) => {
      poly(ctx, pts);
      ctx.fillStyle = `rgba(255, 213, 126, ${windowLight})`;
      ctx.shadowColor = `rgba(255, 190, 90, ${windowLight})`;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    };
    win([P(x + 0.36, y + 1, z + 0.22), P(x + 0.64, y + 1, z + 0.22), P(x + 0.64, y + 1, z + 0.66), P(x + 0.36, y + 1, z + 0.66)]);
    win([P(x + 1, y + 0.36, z + 0.22), P(x + 1, y + 0.64, z + 0.22), P(x + 1, y + 0.64, z + 0.66), P(x + 1, y + 0.36, z + 0.66)]);
  }
};

const drawLamp = (ctx: CanvasRenderingContext2D, L: Layout, [sx, sy]: Pt, glow: number, t: number, phase: number) => {
  const flick = 0.9 + 0.1 * Math.sin(t / 170 + phase) * Math.sin(t / 410 + phase * 2);
  const postH = L.bh * 1.25;
  const headY = sy - postH;
  const halo = L.tw * (1.15 + 0.7 * glow) * flick;
  const g = ctx.createRadialGradient(sx, headY, 1, sx, headY, halo);
  g.addColorStop(0, 'rgba(255, 220, 140, 0.9)');
  g.addColorStop(0.22, 'rgba(255, 180, 80, 0.38)');
  g.addColorStop(1, 'rgba(255, 170, 70, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, headY, halo, 0, Math.PI * 2);
  ctx.fill();
  // Post and base.
  ctx.fillStyle = 'rgba(10, 6, 20, 0.35)';
  ctx.beginPath();
  ctx.ellipse(sx, sy, L.tw * 0.12, L.th * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#231a30';
  ctx.lineWidth = Math.max(2.5, L.tw * 0.055);
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, headY + L.tw * 0.08);
  ctx.stroke();
  // Lantern: cap, glass, base.
  const w = L.tw * 0.17;
  const h = L.tw * 0.22;
  ctx.fillStyle = '#231a30';
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.9, headY - h * 0.55);
  ctx.lineTo(sx, headY - h * 1.05);
  ctx.lineTo(sx + w * 0.9, headY - h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255, 226, 150, ${0.85 + 0.15 * flick})`;
  ctx.fillRect(sx - w * 0.6, headY - h * 0.55, w * 1.2, h * 1.05);
  ctx.strokeStyle = '#231a30';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sx - w * 0.6, headY - h * 0.55, w * 1.2, h * 1.05);
  ctx.fillStyle = '#231a30';
  ctx.fillRect(sx - w * 0.75, headY + h * 0.5, w * 1.5, h * 0.18);
};

export const spawnSparks = (L: Layout, s: SceneState) => {
  for (const [x, y] of lampPoints(L)) {
    for (let k = 0; k < 26; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = 60 + Math.random() * 140;
      s.sparks.push({ x, y: y - L.bh * 1.25, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, size: 1.2 + Math.random() * 2.2 });
    }
  }
};

export const drawScene = (ctx: CanvasRenderingContext2D, L: Layout, s: SceneState, t: number, dt: number) => {
  const p = s.puzzle;
  const n = p.n;
  ctx.clearRect(0, 0, L.W, L.H);
  const glow = s.solvedAt ? Math.max(0, 1 - (t - s.solvedAt) / 1100) : 0;

  // Ground glow under the plaza.
  const [gx, gy] = project(L, n / 2, n / 2, 0);
  ctx.save();
  ctx.translate(gx, gy);
  ctx.scale(1, 0.55);
  const gr = Math.min(n * L.tw * 0.75, L.W / 2 - 2);
  const gg = ctx.createRadialGradient(0, 0, 4, 0, 0, gr);
  gg.addColorStop(0, 'rgba(255, 190, 110, 0.18)');
  gg.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(0, 0, gr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const v = views(s.h);
  drawWall(ctx, L, 'R', p.R, v.R, glow, t);
  drawWall(ctx, L, 'C', p.C, v.C, glow, t);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) drawTile(ctx, L, s, i, j, t);

  const order: Cell[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) order.push({ i, j });
  order.sort((a, b) => a.i + a.j - (b.i + b.j));
  for (const { i, j } of order) {
    if (p.rocks?.[i]?.[j]) drawRock(ctx, L, i, j);
    let dx = 0;
    if (s.shake && s.shake.i === i && s.shake.j === j) {
      const k = (t - s.shake.t0) / 320;
      if (k < 1) dx = Math.sin(k * 28) * 0.09 * (1 - k);
      else s.shake = null;
    }
    const k = s.h[i]?.[j] ?? 0;
    const wrong = Boolean(p.top && !p.top[i]?.[j]);
    for (let z = 0; z < k; z++) {
      let zz = z;
      if (s.drop && s.drop.i === i && s.drop.j === j && z === k - 1) {
        const a = Math.min(1, (t - s.drop.t0) / 170);
        const ease = 1 - Math.pow(1 - a, 3);
        zz = z + (1 - ease) * 0.9;
        if (a >= 1) s.drop = null;
      }
      let light = 0;
      if (s.lit && s.solvedAt) light = Math.max(0, Math.min(1, (t - s.solvedAt - (i + j + z) * 70) / 260));
      else if (s.lit) light = 1;
      drawCube(ctx, L, j + dx, i, zz, z, wrong, light * 0.95);
    }
    if (s.hover && s.hover.i === i && s.hover.j === j) {
      poly(ctx, [project(L, j, i, k), project(L, j + 1, i, k), project(L, j + 1, i + 1, k), project(L, j, i + 1, k)]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  const lamps = lampPoints(L);
  lamps.forEach((pt, k) => drawLamp(ctx, L, pt, glow, t, k * 1.7));

  // Sparks.
  if (s.sparks.length) {
    const step = Math.min(0.05, dt / 1000);
    s.sparks = s.sparks.filter((sp) => sp.life > 0);
    for (const sp of s.sparks) {
      sp.x += sp.vx * step;
      sp.y += sp.vy * step;
      sp.vy += 140 * step;
      sp.life -= step * 0.8;
      ctx.fillStyle = `rgba(255, ${190 + Math.round(50 * sp.life)}, 110, ${Math.max(0, sp.life)})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
