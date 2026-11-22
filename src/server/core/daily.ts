import { context, reddit, redis } from '@devvit/web/server';
import { puzzleNumber, twistFor, utcDay } from '../../shared/daily.ts';

export type DailyPostSource = 'cron' | 'menu' | 'install';

export type DailyPostResult = {
  created: boolean;
  postId: string;
  day: string;
};

/** Creates today's daily post once per subreddit per UTC day. */
export const ensureDailyPost = async (source: DailyPostSource): Promise<DailyPostResult> => {
  const subredditName = context.subredditName;
  if (!subredditName) throw new Error('subredditName missing from context');
  const day = utcDay();
  const key = `daily:${day}:post`;
  const existing = await redis.get(key);
  if (existing) return { created: false, postId: existing, day };

  const n = puzzleNumber(day);
  const post = await reddit.submitCustomPost({
    subredditName,
    title: `Two Lamps #${n} · ${twistFor(day).name}`,
    entry: 'default',
    postData: { day, n },
  });
  await redis.set(key, post.id);
  console.log(`daily post ${post.id} for ${day} (${source})`);
  return { created: true, postId: post.id, day };
};
