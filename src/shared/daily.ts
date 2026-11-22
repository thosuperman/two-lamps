import { grid, hashString, maxBuild, matches, parMax, parMin, rng, views, type Grid, type Rules } from './engine.ts';

export type Twist = 'plain' | 'big' | 'rocks' | 'boulders' | 'max' | 'top';

export type TwistInfo = {
  twist: Twist;
  /** Short label for the chip, e.g. "Rock Garden". */
  name: string;
  /** One-line goal shown before the first tap. */
  hint: string;
};

export type Puzzle = Rules & {
  day: string;
  number: number;
  twist: Twist;
  par: number;
};

// Puzzle #1 is 2026-11-17 (UTC).
const EPOCH_MS = Date.UTC(2026, 10, 17);
const DAY_MS = 86_400_000;

export const utcDay = (d: Date = new Date()): string => d.toISOString().slice(0, 10);
export const puzzleNumber = (day: string): number => Math.floor((Date.parse(`${day}T00:00:00Z`) - EPOCH_MS) / DAY_MS) + 1;
export const addDays = (day: string, delta: number): string => utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS));
export const isValidDay = (day: unknown): day is string =>
  typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`));

// Weekly arc (UTC weekday): each day changes how you think, not just the size.
const ARC: Record<number, TwistInfo> = {
  1: { twist: 'plain', name: 'Warm-up', hint: 'Match both shadows with as few blocks as you can' },
  2: { twist: 'big', name: 'Big Plot', hint: 'A bigger plot. Fewest blocks wins' },
  3: { twist: 'rocks', name: 'Rock Garden', hint: 'Nothing stands on rocks' },
  4: { twist: 'boulders', name: 'Boulder Field', hint: 'More rocks, fewer shortcuts' },
  5: { twist: 'max', name: 'Full House', hint: 'Same shadows, but use the MOST blocks' },
  6: { twist: 'top', name: 'Third Lamp', hint: 'A lamp above lights the tiles you must fill' },
  0: { twist: 'big', name: 'Grand Plot', hint: 'Sunday special. Fewest blocks wins' },
};

export const twistFor = (day: string): TwistInfo => ARC[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? ARC[1]!;

type Spec = { n: number; H: number; rocks: number };
const SPECS: Record<Twist, Spec> = {
  plain: { n: 4, H: 3, rocks: 0 },
  big: { n: 5, H: 4, rocks: 0 },
  rocks: { n: 5, H: 4, rocks: 3 },
  boulders: { n: 5, H: 4, rocks: 5 },
  max: { n: 4, H: 3, rocks: 0 },
  top: { n: 5, H: 3, rocks: 0 },
};

const attempt = (twist: Twist, rand: () => number): (Rules & { par: number }) | null => {
  const { n, H, rocks: rockCount } = SPECS[twist];
  const rocks = grid(n, () => false);
  let placed = 0;
  while (placed < rockCount) {
    const i = Math.floor(rand() * n);
    const j = Math.floor(rand() * n);
    const row = rocks[i];
    if (row && !row[j]) {
      row[j] = true;
      placed++;
    }
  }
  const sol: Grid<number> = grid(n, (i, j) => {
    if (rocks[i]?.[j]) return 0;
    if (rand() < 0.45) return 0;
    return 1 + Math.floor(Math.pow(rand(), 1.3) * H);
  });
  const v = views(sol);
  if (v.R.includes(0) || v.C.includes(0)) return null;
  const heights = new Set([...v.R, ...v.C]);
  if (heights.size < Math.min(3, H) || !heights.has(H)) return null;

  const base: Rules = { n, R: v.R, C: v.C, rocks: rockCount ? rocks : null, top: null, mode: 'min' };
  const plainMin = parMin({ ...base, rocks: null });
  const min = parMin(base);
  const max = parMax(base);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  switch (twist) {
    case 'plain':
      return min <= 0.6 * max && min >= n * 2 ? { ...base, par: min } : null;
    case 'big':
      return min <= 0.45 * max && min >= 14 ? { ...base, par: min } : null;
    case 'rocks':
    case 'boulders':
      // Rocks must break at least one easy pairing, or the twist is cosmetic.
      return min > plainMin && min <= 0.7 * max ? { ...base, par: min } : null;
    case 'max':
      return max - min >= 8 && max <= 32 ? { ...base, mode: 'max', par: max } : null;
    case 'top': {
      const p: Rules = { ...base, top: v.F };
      const cells = v.F.flat().filter(Boolean).length;
      const tmin = parMin(p);
      if (cells < 7 || cells > 14 || tmin < plainMin + 3 || parMax(p) - tmin < 3) return null;
      return { ...p, par: tmin };
    }
  }
};

const cache = new Map<string, Puzzle>();

/** The puzzle for a UTC day. Deterministic: client and server generate the same one. */
export const dailyPuzzle = (day: string): Puzzle => {
  const hit = cache.get(day);
  if (hit) return hit;
  const { twist } = twistFor(day);
  const rand = rng(hashString(`two-lamps:${day}`));
  let found: (Rules & { par: number }) | null = null;
  for (let tries = 0; !found && tries < 100_000; tries++) found = attempt(twist, rand);
  if (!found || !matches(found, maxBuild(found))) throw new Error(`no puzzle for ${day}`);
  const puzzle: Puzzle = { ...found, day, number: puzzleNumber(day), twist };
  cache.set(day, puzzle);
  return puzzle;
};
