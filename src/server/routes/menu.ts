import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { ensureDailyPost } from '../core/daily.ts';

export const menu = new Hono();

const postUrl = (postId: string) =>
  `https://reddit.com/r/${context.subredditName}/comments/${postId.replace(/^t3_/, '')}`;

// Creates (or opens) today's daily post by hand. Fallback if cron fails.
menu.post('/daily-post', async (c) => {
  try {
    const res = await ensureDailyPost('menu');
    return c.json<UiResponse>({ navigateTo: postUrl(res.postId) }, 200);
  } catch (error) {
    console.error(`daily-post menu failed: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create the daily post' }, 400);
  }
});
