import './index.css';

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { context, requestExpandedMode } from '@devvit/web/client';
import { grid } from '../shared/engine.ts';
import { dailyPuzzle, isValidDay, twistFor, utcDay } from '../shared/daily.ts';
import type { StateResponse } from '../shared/api.ts';
import { starString } from '../shared/stats.ts';
import { Board } from './game/Board.tsx';
import { Flame, Lantern } from './game/icons.tsx';
import { fetchState } from './game/net.ts';

const dayOf = (): string => {
  const d = context.postData?.['day'];
  return isValidDay(d) ? d : utcDay();
};

// Inline feed card: today's actual plaza, lamps lit, one Play button. Never scrolls.
export const Splash = () => {
  const day = useMemo(() => dayOf(), []);
  const puzzle = useMemo(() => dailyPuzzle(day), [day]);
  const info = twistFor(day);
  const [state, setState] = useState<StateResponse | null>(null);
  useEffect(() => {
    void fetchState(day).then(setState);
  }, [day]);
  const rec = state?.record ?? null;
  const build = rec?.build ?? grid(puzzle.n, () => 0);
  const players = state?.stats.players ?? 0;

  return (
    <div className="splash" onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
      <div className="splash-head">
        <div className="brand">
          <Lantern size={24} />
          <div>
            <div className="brand-name">Two Lamps</div>
            <div className="brand-sub">
              #{puzzle.number} · {info.name}
            </div>
          </div>
        </div>
        {(state?.streak.count ?? 0) > 0 && (
          <div className="streak-pill">
            <Flame /> {state?.streak.count}
          </div>
        )}
      </div>
      <div className="splash-board">
        <Board puzzle={puzzle} h={build} hintTile={null} lit={Boolean(rec)} solvedAt={null} interactive={false} mode="add" padTop={16} padBottom={4} />
      </div>
      <div className="splash-foot">
        <div className="splash-tag">
          {rec ? (
            <>
              <span className="peek-stars">{starString(rec.stars)}</span> {rec.best} blocks · par {puzzle.par}
            </>
          ) : (
            <>Stack blocks so both shadows match</>
          )}
        </div>
        <button className="btn btn-primary splash-play" onClick={(e) => { e.stopPropagation(); requestExpandedMode(e.nativeEvent, 'game'); }}>
          {!rec ? 'Play' : rec.best === puzzle.par ? 'View result' : 'Improve'}
        </button>
        <div className="splash-meta">{players > 0 ? `${players} played today` : 'New puzzle every day'}</div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
