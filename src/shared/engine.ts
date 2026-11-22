// Two Lamps engine: projections, validation and exact par.
// Shared by client (instant feedback) and server (authoritative scoring).

export type Grid<T> = T[][];

export type Rules = {
  n: number;
  /** Target shadow height per row (left wall). */
  R: number[];
  /** Target shadow height per column (right wall). */
  C: number[];
  /** Unbuildable tiles. */
  rocks: Grid<boolean> | null;
  /** Third lamp: exact footprint that must be covered. */
  top: Grid<boolean> | null;
  /** 'min' = fewest blocks wins, 'max' = most blocks wins. */
  mode: 'min' | 'max';
};

export type Views = { R: number[]; C: number[]; F: Grid<boolean> };

export const grid = <T>(n: number, f: (i: number, j: number) => T): Grid<T> =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => f(i, j)));

export const cell = <T>(g: Grid<T>, i: number, j: number, fallback: T): T => g[i]?.[j] ?? fallback;

export const views = (h: Grid<number>): Views => {
  const n = h.length;
  const R = new Array<number>(n).fill(0);
  const C = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const v = cell(h, i, j, 0);
      if (v > (R[i] ?? 0)) R[i] = v;
      if (v > (C[j] ?? 0)) C[j] = v;
    }
  return { R, C, F: h.map((row) => row.map((v) => v > 0)) };
};

export const total = (h: Grid<number>): number => h.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);

const maxMatching = (adj: number[][], nRight: number): number => {
  const matchR = new Array<number>(nRight).fill(-1);
  const tryL = (l: number, seen: boolean[]): boolean => {
    for (const r of adj[l] ?? []) {
      if (seen[r]) continue;
      seen[r] = true;
      const cur = matchR[r] ?? -1;
      if (cur === -1 || tryL(cur, seen)) {
        matchR[r] = l;
        return true;
      }
    }
    return false;
  };
  let m = 0;
  for (let l = 0; l < adj.length; l++) if (tryL(l, new Array<boolean>(nRight).fill(false))) m++;
  return m;
};

export const allowed = (p: Rules, i: number, j: number): boolean => {
  if (p.rocks && cell(p.rocks, i, j, false)) return false;
  if (p.top && !cell(p.top, i, j, false)) return false;
  return true;
};

/**
 * Exact minimum number of blocks whose views equal the targets.
 * Per height h, each row with R=h and column with C=h needs a block of height
 * exactly h; one stack serves a row and a column only when both targets are h,
 * so cost(h) = h * (rows + cols - maxMatching). With a footprint every covered
 * tile costs 1, and raising one to h costs h-1 more. Verified against brute force.
 */
export const parMin = (p: Rules): number => {
  const { n, R, C } = p;
  const base = p.top ? 1 : 0;
  let cost = 0;
  if (p.top) {
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (cell(p.top, i, j, false)) {
          if (!allowed(p, i, j) || Math.min(R[i] ?? 0, C[j] ?? 0) < 1) return Infinity;
          cost += 1;
        }
  }
  const levels = [...new Set([...R, ...C])].filter((v) => v > 0);
  for (const h of levels) {
    const rows: number[] = [];
    const cols: number[] = [];
    R.forEach((v, i) => v === h && rows.push(i));
    C.forEach((v, j) => v === h && cols.push(j));
    for (const i of rows) if (!C.some((c, j) => allowed(p, i, j) && c >= h)) return Infinity;
    for (const j of cols) if (!R.some((r, i) => allowed(p, i, j) && r >= h)) return Infinity;
    if (h <= base) continue;
    const adj = rows.map((i) => cols.flatMap((j, k) => (allowed(p, i, j) ? [k] : [])));
    cost += (h - base) * (rows.length + cols.length - maxMatching(adj, cols.length));
  }
  return cost;
};

/** The build with the most blocks: every allowed tile at min(R_i, C_j). */
export const maxBuild = (p: Rules): Grid<number> =>
  grid(p.n, (i, j) => (allowed(p, i, j) ? Math.min(p.R[i] ?? 0, p.C[j] ?? 0) : 0));

export const matches = (p: Rules, h: Grid<number>): boolean => {
  if (h.length !== p.n || h.some((row) => row.length !== p.n)) return false;
  for (let i = 0; i < p.n; i++)
    for (let j = 0; j < p.n; j++) {
      const v = cell(h, i, j, 0);
      if (!Number.isInteger(v) || v < 0) return false;
      if (p.rocks && cell(p.rocks, i, j, false) && v > 0) return false;
    }
  const v = views(h);
  if (v.R.some((x, k) => x !== p.R[k]) || v.C.some((x, k) => x !== p.C[k])) return false;
  if (p.top) for (let i = 0; i < p.n; i++) for (let j = 0; j < p.n; j++) if (cell(v.F, i, j, false) !== cell(p.top, i, j, false)) return false;
  return true;
};

export const parMax = (p: Rules): number => {
  const h = maxBuild(p);
  return matches(p, h) ? total(h) : -Infinity;
};

export const par = (p: Rules): number => (p.mode === 'max' ? parMax(p) : parMin(p));

/** Stars for a solved build: 3 = par, 2 = within 2 of par, 1 = solved. */
export const stars = (p: Rules, parValue: number, blocks: number): 1 | 2 | 3 => {
  const d = p.mode === 'max' ? parValue - blocks : blocks - parValue;
  return d <= 0 ? 3 : d <= 2 ? 2 : 1;
};

/** Deterministic PRNG (mulberry32). */
export const rng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** FNV-1a string hash, for seeding from a date. */
export const hashString = (s: string): number => {
  let h = 0x811c9dc5;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};
