import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grid, matches, parMax, parMin, rng, total, views, type Grid, type Rules } from './engine.ts';
import { addDays, dailyPuzzle, puzzleNumber, twistFor } from './daily.ts';

// Exhaustive search over every build on a small grid.
const brute = (p: Rules, H: number): { min: number; max: number } => {
  const n = p.n;
  const cells = n * n;
  let min = Infinity;
  let max = -Infinity;
  const h: Grid<number> = grid(n, () => 0);
  for (let code = 0; code < (H + 1) ** cells; code++) {
    let c = code;
    for (let k = 0; k < cells; k++) {
      h[Math.floor(k / n)]![k % n] = c % (H + 1);
      c = Math.floor(c / (H + 1));
    }
    if (matches(p, h)) {
      const s = total(h);
      if (s < min) min = s;
      if (s > max) max = s;
    }
  }
  return { min, max };
};

void test('par equals brute force on random 3x3 grids with rocks and footprints', () => {
  const rand = rng(12345);
  for (let t = 0; t < 120; t++) {
    const rocks = grid(3, () => rand() < 0.2);
    const sol = grid(3, (i, j) => (rocks[i]![j] ? 0 : Math.floor(rand() * 3)));
    const v = views(sol);
    const p: Rules = { n: 3, R: v.R, C: v.C, rocks, top: t % 3 === 2 ? v.F : null, mode: 'min' };
    const b = brute(p, 2);
    assert.equal(parMin(p), b.min, `min case ${t}`);
    assert.equal(parMax(p), b.max, `max case ${t}`);
  }
});

void test('matches rejects blocks on rocks and malformed grids', () => {
  const p: Rules = { n: 2, R: [1, 1], C: [1, 1], rocks: [[false, true], [false, false]], top: null, mode: 'min' };
  assert.equal(matches(p, [[1, 0], [0, 1]]), true);
  assert.equal(matches(p, [[0, 1], [1, 0]]), false);
  assert.equal(matches(p, [[1, 0]]), false);
  assert.equal(matches(p, [[1.5, 0], [0, 1]]), false);
});

void test('daily puzzles are deterministic, solvable and follow the weekly arc', () => {
  let day = '2026-11-17';
  for (let k = 0; k < 60; k++) {
    const a = dailyPuzzle(day);
    assert.deepEqual(a, dailyPuzzle(day));
    assert.equal(a.number, puzzleNumber(day));
    assert.equal(a.twist, twistFor(day).twist);
    assert.ok(Number.isFinite(a.par) && a.par > 0, `${day} par`);
    assert.equal(a.par, a.mode === 'max' ? parMax(a) : parMin(a));
    day = addDays(day, 1);
  }
  assert.equal(puzzleNumber('2026-11-17'), 1);
  assert.equal(twistFor('2026-11-18').twist, 'rocks'); // Wednesday
  assert.equal(twistFor('2026-11-20').twist, 'max'); // Friday
});
