import { useEffect, useState } from 'react';
import type { DayStats, Streak } from '../../shared/api.ts';
import { Close, Comment, Flame, ShareIcon } from './icons.tsx';

export type ResultView = {
  number: number;
  twistName: string;
  mode: 'min' | 'max';
  blocks: number;
  par: number;
  stars: 1 | 2 | 3;
  firstTryPar: boolean;
  streak: Streak;
  stats: DayStats;
  beats: number | null;
  loggedIn: boolean;
  isToday: boolean;
  shared: boolean;
  flairOn: boolean;
  nextAt: number;
};

type Props = {
  view: ResultView;
  onClose: () => void;
  onImprove: () => void;
  onComment: () => void;
  onShare: () => void;
  onFlair: (on: boolean) => void;
  onLogin: () => void;
  busy: boolean;
};

const countdown = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
};

const Histogram = ({ view }: { view: ResultView }) => {
  const entries = Object.entries(view.stats.hist)
    .map(([k, v]) => [Number(k), v] as const)
    .filter(([, v]) => v > 0);
  if (!entries.some(([k]) => k === view.blocks)) entries.push([view.blocks, 1]);
  entries.sort((a, b) => (view.mode === 'max' ? b[0] - a[0] : a[0] - b[0]));
  const shown = entries.slice(0, 9);
  const top = Math.max(...shown.map(([, v]) => v));
  return (
    <div className="hist" aria-label="Today's results">
      {shown.map(([k, v]) => (
        <div key={k} className={`hist-col${k === view.blocks ? ' mine' : ''}${k === view.par ? ' par' : ''}`}>
          <div className="hist-bar" style={{ height: `${Math.max(8, (v / top) * 100)}%` }}>
            <span className="hist-n">{v}</span>
          </div>
          <div className="hist-k">{k}</div>
        </div>
      ))}
    </div>
  );
};

export const ResultSheet = ({ view, onClose, onImprove, onComment, onShare, onFlair, onLogin, busy }: Props) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const atPar = view.blocks === view.par;
  const gap = Math.abs(view.blocks - view.par);
  const headline = atPar ? (view.firstTryPar ? 'Flawless!' : 'Perfect build!') : view.stars === 2 ? 'So close!' : 'Lamps lit!';
  const sub = atPar
    ? view.mode === 'max'
      ? 'The most blocks those shadows allow.'
      : 'Nobody can do it with fewer.'
    : `Par is ${view.par}. ${gap} ${view.mode === 'max' ? 'more' : 'fewer'} block${gap === 1 ? '' : 's'} to go.`;

  return (
    <div className="sheet" role="dialog" aria-label="Result">
      <button className="sheet-close" onClick={onClose} aria-label="Back to the board">
        <Close />
      </button>
      <div className="sheet-kicker">
        Two Lamps #{view.number} · {view.twistName}
      </div>
      <h2 className="sheet-title">{headline}</h2>
      <div className="stars" aria-label={`${view.stars} of 3 stars`}>
        {[1, 2, 3].map((k) => (
          <span key={k} className={`star${k <= view.stars ? ' on' : ''}`} style={{ animationDelay: `${0.15 + k * 0.16}s` }}>
            ★
          </span>
        ))}
      </div>
      <div className="score-line">
        <span className="score-big">{view.blocks}</span>
        <span className="score-unit">blocks</span>
        <span className="score-par">par {view.par}</span>
        {view.firstTryPar && <span className="badge">First try</span>}
      </div>
      <p className="sheet-sub">{sub}</p>

      {!atPar && (
        <button className="btn btn-primary wide" onClick={onImprove}>
          {view.mode === 'max' ? 'Go for more' : 'Go for par'}
        </button>
      )}

      <div className="panel">
        <div className="panel-row">
          <div>
            <div className="panel-label">Today on this subreddit</div>
            <div className="panel-value">
              {view.stats.players <= 1
                ? 'You are the first to light the lamps'
                : view.beats !== null
                  ? `Better than ${view.beats}% of ${view.stats.players} players`
                  : `${view.stats.players} players`}
            </div>
          </div>
          {view.streak.count > 0 && (
            <div className="streak-chip" aria-label={`${view.streak.count}-day streak`}>
              <Flame size={18} />
              {view.streak.count}
            </div>
          )}
        </div>
        <Histogram view={view} />
        <div className="hist-legend">
          <span className="dot mine" /> you <span className="dot par" /> par
        </div>
      </div>

      {view.loggedIn ? (
        <>
          <div className="share-row">
            <button className="btn btn-gold" onClick={onComment} disabled={busy || view.shared}>
              <Comment /> {view.shared ? 'Posted' : 'Post to comments'}
            </button>
            <button className="btn btn-ghost" onClick={onShare} disabled={busy}>
              <ShareIcon /> Share
            </button>
          </div>
          <p className="fine">Post to comments adds your score as a comment from your account.</p>
          {view.isToday && (
            <label className="toggle">
              <input type="checkbox" checked={view.flairOn} disabled={busy} onChange={(e) => onFlair(e.target.checked)} />
              <span className="toggle-track" />
              <span>Wear your streak as flair</span>
            </label>
          )}
        </>
      ) : (
        <button className="btn btn-gold wide" onClick={onLogin}>
          Log in to keep your streak
        </button>
      )}

      <div className="next">
        {view.isToday ? (
          <>
            Next puzzle in <b>{countdown(view.nextAt - now)}</b>
          </>
        ) : (
          <>Streaks count on the newest daily post.</>
        )}
      </div>
    </div>
  );
};
