import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type { FlairResponse, ShareResponse, SolveRequest, SolveResponse, StateResponse } from '../../shared/api.ts';
import { dailyPuzzle, isValidDay, utcDay } from '../../shared/daily.ts';
import { beatsShare } from '../../shared/stats.ts';
import { applyFlair, getRecord, getStats, getStreak, removeFlair, shareText, solve } from '../core/game.ts';

export const api = new Hono();

const nextMidnight = (): number => {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};

/** The puzzle day for this post: the requested day, its postData day, or today. */
const postDay = (requested: unknown): string => {
  if (isValidDay(requested)) return requested;
  const fromPost = context.postData?.['day'];
  return isValidDay(fromPost) ? fromPost : utcDay();
};

const noStreak = { count: 0, max: 0, today: false };

api.get('/state', async (c) => {
  const today = utcDay();
  const day = postDay(c.req.query('day'));
  const username = (await reddit.getCurrentUsername()) ?? null;
  const [record, streak, stats, flairOn, shared] = await Promise.all([
    username ? getRecord(day, username) : Promise.resolve(null),
    username ? getStreak(username, today) : Promise.resolve(noStreak),
    getStats(day),
    username ? redis.get(`flair:${username}`) : Promise.resolve(undefined),
    username ? redis.get(`shared:${day}:${username}`) : Promise.resolve(undefined),
  ]);
  return c.json<StateResponse>({
    type: 'state',
    day,
    today,
    username,
    record,
    streak,
    stats,
    flairOn: Boolean(flairOn),
    shared: Boolean(shared),
    nextAt: nextMidnight(),
  });
});

api.post('/solve', async (c) => {
  const body = await c.req.json<Partial<SolveRequest>>();
  const day = postDay(body.day);
  const build = Array.isArray(body.build) ? body.build : [];
  const username = (await reddit.getCurrentUsername()) ?? null;
  const out = await solve(day, utcDay(), build, body.firstTry === true, username);
  if (!out.ok) {
    return c.json<SolveResponse>(
      {
        type: 'solve',
        ok: false,
        error: out.error,
        blocks: 0,
        par: 0,
        stars: 1,
        improved: false,
        record: null,
        streak: noStreak,
        stats: { players: 0, parCount: 0, hist: {} },
        beats: null,
        saved: false,
      },
      400
    );
  }
  const best = out.record?.best ?? out.blocks;
  return c.json<SolveResponse>({
    type: 'solve',
    ok: true,
    blocks: out.blocks,
    par: out.puzzle.par,
    stars: out.stars,
    improved: out.improved,
    record: out.record,
    streak: out.streak,
    stats: out.stats,
    beats: beatsShare(out.puzzle.mode, out.stats, best),
    saved: out.saved,
  });
});

// Posting a comment as the player: only from an explicit Share tap, once per puzzle.
api.post('/share', async (c) => {
  const { postId } = context;
  const username = await reddit.getCurrentUsername();
  const body = await c.req.json<{ day?: string }>();
  const day = postDay(body.day);
  if (!postId || !username) return c.json<ShareResponse>({ type: 'share', ok: false, error: 'Log in to share' }, 400);
  const rec = await getRecord(day, username);
  if (!rec) return c.json<ShareResponse>({ type: 'share', ok: false, error: 'Solve the puzzle first' }, 400);
  if (await redis.get(`shared:${day}:${username}`)) {
    return c.json<ShareResponse>({ type: 'share', ok: false, error: 'Already shared' }, 409);
  }
  try {
    const streak = await getStreak(username, utcDay());
    await reddit.submitComment({ id: postId, text: shareText(dailyPuzzle(day), rec, streak), runAs: 'USER' });
    await redis.set(`shared:${day}:${username}`, '1');
    return c.json<ShareResponse>({ type: 'share', ok: true });
  } catch (error) {
    console.error(`share failed: ${String(error)}`);
    return c.json<ShareResponse>({ type: 'share', ok: false, error: 'Could not post the comment' }, 500);
  }
});

// Streak flair: opt in or out. While on, every daily solve refreshes it.
api.post('/flair', async (c) => {
  const username = await reddit.getCurrentUsername();
  const { on } = await c.req.json<{ on?: boolean }>();
  if (!username) return c.json<FlairResponse>({ type: 'flair', ok: false, on: false, error: 'Log in first' }, 400);
  try {
    if (on) {
      const streak = await getStreak(username, utcDay());
      const text = await applyFlair(username, streak.count);
      await redis.set(`flair:${username}`, '1');
      return c.json<FlairResponse>({ type: 'flair', ok: true, on: true, text });
    }
    await removeFlair(username);
    await redis.del(`flair:${username}`);
    return c.json<FlairResponse>({ type: 'flair', ok: true, on: false });
  } catch (error) {
    console.error(`flair failed: ${String(error)}`);
    return c.json<FlairResponse>({ type: 'flair', ok: false, on: Boolean(on), error: 'Could not update flair' }, 500);
  }
});
