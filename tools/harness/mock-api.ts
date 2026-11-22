// In-memory /api for the harness. Mirrors the server contract.
import { matches, stars, total } from '../../src/shared/engine.ts';
import { dailyPuzzle } from '../../src/shared/daily.ts';
import { beatsShare } from '../../src/shared/stats.ts';

const params = new URLSearchParams(location.search);
const loggedIn = params.get('anon') !== '1';
const hist: Record<string, number> = JSON.parse(params.get('hist') ?? '{}');
let record: { best: number; firstSolve: number; stars: 1 | 2 | 3; firstTryPar: boolean; build: number[][] } | null = null;
const streak = { count: Number(params.get('streak') ?? 2), max: 5, today: false };
const today = new Date().toISOString().slice(0, 10);
const stats = () => {
  const h = { ...hist };
  if (record) h[record.best] = (h[record.best] ?? 0) + 1;
  const players = Object.values(h).reduce((a, b) => a + b, 0);
  return { players, parCount: 0, hist: h };
};
const real = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.startsWith('/api/')) return real(input, init);
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  const day = new URL(url, location.href).searchParams.get('day') ?? body.day ?? today;
  const reply = (o: unknown) => new Response(JSON.stringify(o), { headers: { 'Content-Type': 'application/json' } });
  await new Promise((r) => setTimeout(r, 120));
  if (url.startsWith('/api/state')) {
    return reply({ type: 'state', day, today, username: loggedIn ? 'tester' : null, record, streak, stats: stats(), flairOn: false, shared: false, nextAt: Date.now() + 5.2 * 3600e3 });
  }
  if (url.startsWith('/api/solve')) {
    const p = dailyPuzzle(day);
    if (!matches(p, body.build)) return reply({ type: 'solve', ok: false, error: 'no match' });
    const b = total(body.build);
    const better = !record || (p.mode === 'max' ? b > record.best : b < record.best);
    if (better) record = { best: b, firstSolve: record?.firstSolve ?? b, stars: stars(p, p.par, b), firstTryPar: body.firstTry && b === p.par, build: body.build };
    if (day === today) streak.today = true;
    const s = stats();
    return reply({ type: 'solve', ok: true, blocks: b, par: p.par, stars: stars(p, p.par, b), improved: better, record, streak: { ...streak, count: streak.count + 1 }, stats: s, beats: beatsShare(p.mode, s, record!.best), saved: loggedIn });
  }
  if (url.startsWith('/api/share')) return reply({ type: 'share', ok: true });
  if (url.startsWith('/api/flair')) return reply({ type: 'flair', ok: true, on: body.on, text: '🏮 Two Lamps · 🔥 3-day streak' });
  return reply({});
};
