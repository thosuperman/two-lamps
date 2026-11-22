import { context, reddit, redis } from '@devvit/web/server';
import { matches, stars, total } from '../../shared/engine.ts';
import { addDays, dailyPuzzle, twistFor, type Puzzle } from '../../shared/daily.ts';
import type { DayStats, PlayRecord, Streak } from '../../shared/api.ts';
import { starString } from '../../shared/stats.ts';

// Redis layout (per subreddit installation):
//   rec:{day}          hash  user → PlayRecord JSON
//   hist:{day}         hash  best blocks → players
//   par:{day}          hash  user → "1" when their best equals par
//   streak:{user}      hash  last (day), count, max
//   flair:{user}       "1"   player opted in to streak flair
//   shared:{day}:{u}   "1"   result already shared as a comment

const recKey = (day: string) => `rec:${day}`;
const histKey = (day: string) => `hist:${day}`;
const parKey = (day: string) => `par:${day}`;

export const getRecord = async (day: string, user: string): Promise<PlayRecord | null> => {
  const raw = await redis.hGet(recKey(day), user);
  if (!raw) return null;
  try {
    const rec: PlayRecord = JSON.parse(raw);
    return rec;
  } catch {
    return null;
  }
};

export const getStats = async (day: string): Promise<DayStats> => {
  const [hist, parCount] = await Promise.all([redis.hGetAll(histKey(day)), redis.hLen(parKey(day))]);
  const clean: Record<string, number> = {};
  let players = 0;
  for (const [k, v] of Object.entries(hist ?? {})) {
    const n = Number(String(v));
    if (n > 0) {
      clean[k] = n;
      players += n;
    }
  }
  return { players, parCount, hist: clean };
};

export const getStreak = async (user: string, today: string): Promise<Streak> => {
  const s = await redis.hGetAll(`streak:${user}`);
  const last = s?.last ?? '';
  const count = Number(s?.count ?? 0);
  const max = Number(s?.max ?? 0);
  const alive = last === today || last === addDays(today, -1);
  return { count: alive ? count : 0, max, today: last === today };
};

const bumpStreak = async (user: string, today: string): Promise<Streak> => {
  const key = `streak:${user}`;
  const s = await redis.hGetAll(key);
  const last = s?.last ?? '';
  if (last === today) return getStreak(user, today);
  const count = last === addDays(today, -1) ? Number(s?.count ?? 0) + 1 : 1;
  const max = Math.max(count, Number(s?.max ?? 0));
  await redis.hSet(key, { last: today, count: String(count), max: String(max) });
  return { count, max, today: true };
};

export type SolveOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      puzzle: Puzzle;
      blocks: number;
      stars: 1 | 2 | 3;
      improved: boolean;
      record: PlayRecord | null;
      streak: Streak;
      stats: DayStats;
      saved: boolean;
    };

/** Verifies a build against the day's puzzle and records it for the player. */
export const solve = async (
  day: string,
  today: string,
  build: number[][],
  firstTry: boolean,
  user: string | null
): Promise<SolveOutcome> => {
  if (day > today) return { ok: false, error: 'This puzzle is not open yet' };
  const puzzle = dailyPuzzle(day);
  if (!matches(puzzle, build)) return { ok: false, error: 'The shadows do not match yet' };
  const blocks = total(build);
  const st = stars(puzzle, puzzle.par, blocks);

  if (!user) {
    const stats = await getStats(day);
    return { ok: true, puzzle, blocks, stars: st, improved: false, record: null, streak: { count: 0, max: 0, today: false }, stats, saved: false };
  }

  const prev = await getRecord(day, user);
  const better = !prev || (puzzle.mode === 'max' ? blocks > prev.best : blocks < prev.best);
  let record = prev;
  if (better) {
    record = {
      best: blocks,
      firstSolve: prev?.firstSolve ?? blocks,
      stars: st,
      firstTryPar: prev?.firstTryPar || (firstTry && blocks === puzzle.par),
      build,
    };
    await redis.hSet(recKey(day), { [user]: JSON.stringify(record) });
    if (prev) await redis.hIncrBy(histKey(day), String(prev.best), -1);
    await redis.hIncrBy(histKey(day), String(blocks), 1);
    if (blocks === puzzle.par) await redis.hSet(parKey(day), { [user]: '1' });
  }
  // Streaks count today's puzzle only; old puzzles stay playable for fun.
  const streak = day === today ? await bumpStreak(user, today) : await getStreak(user, today);
  if (day === today && (await redis.get(`flair:${user}`))) await applyFlair(user, streak.count).catch(() => undefined);
  const stats = await getStats(day);
  return { ok: true, puzzle, blocks, stars: st, improved: better, record, streak, stats, saved: true };
};

export const flairText = (streak: number): string =>
  streak > 1 ? `🏮 Two Lamps · 🔥 ${streak}-day streak` : '🏮 Two Lamps player';

export const applyFlair = async (user: string, streak: number): Promise<string> => {
  const subredditName = context.subredditName;
  if (!subredditName) throw new Error('no subreddit');
  const text = flairText(streak);
  await reddit.setUserFlair({ subredditName, username: user, text, backgroundColor: '#ffc94a', textColor: 'dark' });
  return text;
};

export const removeFlair = async (user: string): Promise<void> => {
  const subredditName = context.subredditName;
  if (!subredditName) throw new Error('no subreddit');
  await reddit.removeUserFlair(subredditName, user);
};


/** The comment text a player shares. Built from stored data, never from client input. */
export const shareText = (puzzle: Puzzle, rec: PlayRecord, streak: Streak): string => {
  const info = twistFor(puzzle.day);
  const goal = puzzle.mode === 'max' ? 'most possible' : 'fewest possible';
  const lines = [
    `🏮 Two Lamps #${puzzle.number} · ${info.name}`,
    `${starString(rec.stars)}  ${rec.best} blocks (par ${puzzle.par}, ${goal})${rec.firstTryPar ? ' · first try' : ''}`,
  ];
  if (streak.count > 1) lines.push(`🔥 ${streak.count}-day streak`);
  return lines.join('\n\n');
};
