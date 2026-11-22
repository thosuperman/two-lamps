import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  context,
  showLoginPrompt,
  showShareSheet,
  showToast,
} from '@devvit/web/client';
import {
  grid,
  matches,
  stars,
  total,
  views,
  type Grid,
} from '../../shared/engine.ts';
import {
  dailyPuzzle,
  isValidDay,
  twistFor,
  utcDay,
} from '../../shared/daily.ts';
import type { SolveResponse, StateResponse } from '../../shared/api.ts';
import { beatsShare, starString } from '../../shared/stats.ts';
import { Board, type TapKind } from './Board.tsx';
import { HowTo } from './HowTo.tsx';
import { ResultSheet, type ResultView } from './ResultSheet.tsx';
import {
  BlockMinus,
  BlockPlus,
  ChevronUp,
  Flame,
  Help,
  Lantern,
  Restart,
  Sound,
  Undo,
} from './icons.tsx';
import {
  fetchState,
  loadLocal,
  saveLocal,
  seenFlag,
  setFlair,
  setSeen,
  shareComment,
  submitSolve,
} from './net.ts';
import { isMuted, setMuted, sfx, unlockAudio } from './sound.ts';
import type { Cell } from './scene.ts';
import { wallHeight } from './scene.ts';

const postDay = (): string => {
  const d = context.postData?.['day'];
  return isValidDay(d) ? d : utcDay();
};

const validBuild = (b: unknown, n: number): b is number[][] =>
  Array.isArray(b) &&
  b.length === n &&
  b.every(
    (r) =>
      Array.isArray(r) &&
      r.length === n &&
      r.every((v) => Number.isInteger(v) && v >= 0 && v < 10)
  );

const matchedLines = (
  p: { R: number[]; C: number[] },
  h: Grid<number>
): number => {
  const v = views(h);
  return (
    v.R.filter((x, k) => x === p.R[k]).length +
    v.C.filter((x, k) => x === p.C[k]).length
  );
};

type Sheet = 'closed' | 'open' | 'peek';

export const App = () => {
  const day = useMemo(() => postDay(), []);
  const puzzle = useMemo(() => dailyPuzzle(day), [day]);
  const info = useMemo(() => twistFor(day), [day]);
  const Hw = wallHeight(puzzle);
  const empty = useCallback(() => grid(puzzle.n, () => 0), [puzzle.n]);

  const local = useMemo(() => loadLocal(day), [day]);
  const [h, setH] = useState<Grid<number>>(() =>
    local && validBuild(local.build, puzzle.n) ? local.build : empty()
  );
  const hRef = useRef(h);
  const setBuild = useCallback((next: Grid<number>) => {
    hRef.current = next;
    setH(next);
  }, []);
  const [history, setHistory] = useState<Grid<number>[]>([]);
  const [firstTry, setFirstTry] = useState(local?.firstTry ?? true);
  const [mode, setMode] = useState<TapKind>('add');
  const [state, setState] = useState<StateResponse | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [localBest, setLocalBest] = useState<number | null>(null);
  const [sheet, setSheet] = useState<Sheet>('closed');
  const [solvedAt, setSolvedAt] = useState<number | null>(null);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [seenTap, setSeenTap] = useState(seenFlag('tap'));
  const [seenRemove, setSeenRemove] = useState(seenFlag('remove'));
  const [touched, setTouched] = useState(false);
  const rejectRef = useRef<((c: Cell) => void) | null>(null);
  const dropRef = useRef<((c: Cell) => void) | null>(null);

  const solved = matches(puzzle, h);
  const blocks = total(h);
  const record = result?.record ?? state?.record ?? null;
  const best = record?.best ?? localBest;
  const revealed = best !== null;

  // Load the player's record; a returning player sees their best build.
  useEffect(() => {
    let live = true;
    void fetchState(day).then((s) => {
      if (!live || !s) return;
      setState(s);
      if (s.record) {
        const rb = s.record.build;
        if (total(hRef.current) === 0 && validBuild(rb, puzzle.n)) setBuild(rb);
        setSheet('peek');
      }
    });
    return () => {
      live = false;
    };
  }, [day, puzzle.n, setBuild]);

  useEffect(() => saveLocal(day, { build: h, firstTry }), [day, h, firstTry]);

  const onSolved = useCallback(
    async (build: Grid<number>, ft: boolean) => {
      const b = total(build);
      const prev = best;
      const better =
        prev === null || (puzzle.mode === 'max' ? b > prev : b < prev);
      if (!better) {
        showToast(
          prev === b
            ? 'Matches your best build'
            : `Shadows match. Your best is ${prev}`
        );
        return;
      }
      setSolvedAt(performance.now());
      if (b === puzzle.par) sfx.par();
      else sfx.solve();
      setLocalBest(b);
      setBusy(true);
      const res = await submitSolve({ day, build, firstTry: ft });
      setBusy(false);
      if (res?.ok) setResult(res);
      window.setTimeout(() => setSheet('open'), 1500);
    },
    [best, day, puzzle.mode, puzzle.par]
  );

  const onTap = useCallback(
    (c: Cell, kind: TapKind): Grid<number> | null => {
      unlockAudio();
      setTouched(true);
      if (!seenTap) {
        setSeen('tap');
        setSeenTap(true);
      }
      if (sheet === 'open') setSheet('peek');
      const prev = hRef.current;
      const cur = prev[c.i]?.[c.j] ?? 0;
      if (kind === 'add') {
        if (puzzle.rocks?.[c.i]?.[c.j] || cur >= Hw) {
          rejectRef.current?.(c);
          sfx.bump();
          return null;
        }
      } else if (cur === 0) {
        return null;
      }
      const next = prev.map((row) => row.slice());
      next[c.i]![c.j] = kind === 'add' ? cur + 1 : cur - 1;
      if (kind === 'add') {
        dropRef.current?.(c);
        sfx.place(cur);
      } else {
        sfx.remove(cur);
        if (!seenRemove) {
          setSeen('remove');
          setSeenRemove(true);
        }
      }
      if (matchedLines(puzzle, next) > matchedLines(puzzle, prev)) sfx.match();
      setHistory((hs) => [...hs.slice(-60), prev]);
      setBuild(next);
      if (matches(puzzle, next)) void onSolved(next, firstTry);
      return next;
    },
    [Hw, firstTry, onSolved, puzzle, seenRemove, seenTap, setBuild, sheet]
  );

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((hs) => hs.slice(0, -1));
    setBuild(prev);
  };

  const reset = () => {
    if (total(hRef.current) === 0) return;
    setHistory((hs) => [...hs, hRef.current]);
    setBuild(empty());
    setFirstTry(false);
    setSheet((s) => (s === 'open' ? 'peek' : s));
  };

  const view: ResultView | null = useMemo(() => {
    if (best === null) return null;
    const statsBase = result?.stats ??
      state?.stats ?? { players: 0, parCount: 0, hist: {} };
    const stats =
      statsBase.players > 0
        ? statsBase
        : {
            players: 1,
            parCount: best === puzzle.par ? 1 : 0,
            hist: { [String(best)]: 1 },
          };
    return {
      number: puzzle.number,
      twistName: info.name,
      mode: puzzle.mode,
      blocks: best,
      par: puzzle.par,
      stars: record?.stars ?? stars(puzzle, puzzle.par, best),
      firstTryPar: record?.firstTryPar ?? false,
      streak: result?.streak ??
        state?.streak ?? { count: 0, max: 0, today: false },
      stats,
      beats: result?.beats ?? beatsShare(puzzle.mode, stats, best),
      loggedIn: Boolean(state?.username),
      isToday: !state || state.day === state.today,
      shared: state?.shared ?? false,
      flairOn: state?.flairOn ?? false,
      nextAt:
        state?.nextAt ??
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate() + 1
        ),
    };
  }, [best, info.name, puzzle, record, result, state]);

  const shareText = view
    ? `🏮 Two Lamps #${view.number} · ${view.twistName}\n${starString(view.stars)} ${view.blocks} blocks (par ${view.par})${view.firstTryPar ? ' · first try' : ''}${view.streak.count > 1 ? `\n🔥 ${view.streak.count}-day streak` : ''}`
    : '';

  const onComment = async () => {
    setBusy(true);
    const r = await shareComment(day);
    setBusy(false);
    if (r?.ok) {
      showToast('Posted to the comments');
      setState((s) => (s ? { ...s, shared: true } : s));
    } else showToast(r?.error ?? 'Could not post right now');
  };

  // Native share sheet where Reddit supports it; always also copy the result text.
  const onShare = async () => {
    try {
      await showShareSheet({ title: 'Two Lamps', text: shareText });
    } catch {
      /* not available on this client */
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('Result copied. Paste it anywhere');
    } catch {
      /* clipboard blocked */
    }
  };

  const onFlair = async (on: boolean) => {
    setBusy(true);
    const r = await setFlair(on);
    setBusy(false);
    if (r?.ok) {
      setState((s) => (s ? { ...s, flairOn: r.on } : s));
      showToast(r.on ? `Flair on: ${r.text ?? ''}` : 'Flair removed');
    } else showToast(r?.error ?? 'Could not update flair');
  };

  // Guidance: one short line at a time, only when it helps.
  const v = views(h);
  const over =
    v.R.some((x, k) => x > (puzzle.R[k] ?? 0)) ||
    v.C.some((x, k) => x > (puzzle.C[k] ?? 0));
  const wrongTile = Boolean(
    puzzle.top &&
    h.some((row, i) => row.some((x, j) => x > 0 && !puzzle.top?.[i]?.[j]))
  );
  let hint: string | null = null;
  let hintTile: Cell | null = null;
  if (!revealed) {
    if (!seenTap && blocks === 0) {
      hint = 'Tap a tile to stack a block';
      hintTile = { i: Math.floor(puzzle.n / 2), j: Math.floor(puzzle.n / 2) };
    } else if ((over || wrongTile) && !seenRemove)
      hint = 'Long-press a stack to remove a block';
    else if (!touched && blocks === 0 && info.twist !== 'plain')
      hint = info.hint;
    else if (blocks > 0 && blocks < 4 && !seenFlag('solved'))
      hint = 'Fill each dashed shadow exactly';
  }
  useEffect(() => {
    if (revealed) setSeen('solved');
  }, [revealed]);

  const streakCount = (result?.streak ?? state?.streak)?.count ?? 0;

  return (
    <div className="game">
      <header className="topbar">
        <div className="brand">
          <Lantern size={26} />
          <div>
            <div className="brand-name">Two Lamps</div>
            <div className="brand-sub">
              #{puzzle.number} · {info.name}
            </div>
          </div>
        </div>
        <div className="top-actions">
          {streakCount > 0 && (
            <div
              className="streak-pill"
              aria-label={`${streakCount}-day streak`}
            >
              <Flame /> {streakCount}
            </div>
          )}
          <button
            className="icon-btn"
            onClick={() => setHelp(true)}
            aria-label="How to play"
          >
            <Help />
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
            aria-label={muted ? 'Sound on' : 'Sound off'}
          >
            <Sound off={muted} />
          </button>
        </div>
      </header>

      <main className="stage">
        <Board
          puzzle={puzzle}
          h={h}
          hintTile={hintTile}
          lit={solved}
          solvedAt={solvedAt}
          interactive={!help}
          mode={mode}
          padTop={44}
          padBottom={58}
          onTap={onTap}
          rejectRef={rejectRef}
          dropRef={dropRef}
          buildRef={hRef}
        />
        <div className={`hint${hint && !help ? '' : ' hidden'}`}>
          {hint ?? ''}
        </div>
        {view && sheet === 'peek' && (
          <button className="peek" onClick={() => setSheet('open')}>
            <span className="peek-stars">{starString(view.stars)}</span>
            <span>
              Best <b>{view.blocks}</b> · par {view.par}
            </span>
            <span className="peek-open">
              Results <ChevronUp />
            </span>
          </button>
        )}
      </main>

      <section className="hud">
        <div className="counter">
          <span className={`counter-n${solved ? ' solved' : ''}`}>
            {blocks}
          </span>
          <span className="counter-l">
            {blocks === 1 ? 'block' : 'blocks'}
            <br />
            <em>{puzzle.mode === 'max' ? 'most wins' : 'fewest wins'}</em>
          </span>
        </div>
        <div className="par-box">
          <div className="par-row">
            <span className="par-k">par</span>
            <span className={`par-v${revealed ? '' : ' locked'}`}>
              {revealed ? puzzle.par : '?'}
            </span>
          </div>
          <span className="par-best">
            {revealed ? `your best ${best}` : 'solve to reveal'}
          </span>
        </div>
      </section>

      <nav className="dock">
        <button
          className="dock-btn"
          onClick={undo}
          disabled={!history.length}
          aria-label="Undo"
        >
          <Undo />
        </button>
        <div className="mode" role="group" aria-label="Tap mode">
          <button
            className={mode === 'add' ? 'on' : ''}
            onClick={() => setMode('add')}
          >
            <BlockPlus /> Build
          </button>
          <button
            className={mode === 'remove' ? 'on' : ''}
            onClick={() => setMode('remove')}
          >
            <BlockMinus /> Remove
          </button>
        </div>
        <button
          className="dock-btn"
          onClick={reset}
          disabled={blocks === 0}
          aria-label="Clear the plot"
        >
          <Restart />
        </button>
      </nav>

      {view && sheet === 'open' && (
        <>
          <div className="scrim" onClick={() => setSheet('peek')} />
          <ResultSheet
            view={view}
            busy={busy}
            onClose={() => setSheet('peek')}
            onImprove={() => setSheet('peek')}
            onComment={() => void onComment()}
            onShare={() => void onShare()}
            onFlair={(on) => void onFlair(on)}
            onLogin={() => showLoginPrompt()}
          />
        </>
      )}

      {help && (
        <HowTo
          onClose={() => setHelp(false)}
          twistHint={info.twist === 'plain' ? null : info.hint}
        />
      )}
    </div>
  );
};
