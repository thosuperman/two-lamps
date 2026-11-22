import type { DayStats } from './api.ts';

/** Percentage of the other players a result beats (null when playing alone). */
export const beatsShare = (mode: 'min' | 'max', stats: DayStats, blocks: number): number | null => {
  const others = stats.players - 1;
  if (others <= 0) return null;
  let worse = 0;
  for (const [k, v] of Object.entries(stats.hist)) {
    const b = Number(k);
    if (mode === 'max' ? b < blocks : b > blocks) worse += v;
  }
  return Math.max(0, Math.min(100, Math.round((100 * worse) / others)));
};

export const starString = (s: number): string => '★'.repeat(s) + '☆'.repeat(3 - s);
