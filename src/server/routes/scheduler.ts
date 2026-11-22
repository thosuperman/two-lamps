import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { ensureDailyPost } from '../core/daily.ts';

export const tasks = new Hono();

// Real daily job: cron "0 0 * * *" (UTC midnight).
tasks.post('/daily-post', async (c) => {
  try {
    const res = await ensureDailyPost('cron');
    console.log(`daily-post: ${res.created ? 'created' : 'exists'} ${res.postId} for ${res.day}`);
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  } catch (error) {
    console.error(`cron daily-post failed: ${String(error)}`);
    return c.json<TaskResponse>({ status: 'error' }, 500);
  }
});
