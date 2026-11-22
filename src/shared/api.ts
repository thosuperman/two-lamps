// Client ↔ server contract for Two Lamps.

export type Streak = {
  /** Consecutive UTC days solved, counting today if solved. */
  count: number;
  max: number;
  /** True if today's puzzle is already solved. */
  today: boolean;
};

export type DayStats = {
  players: number;
  /** Players whose best equals par. */
  parCount: number;
  /** Best-result histogram: blocks → players. */
  hist: Record<string, number>;
};

export type PlayRecord = {
  best: number;
  firstSolve: number;
  stars: 1 | 2 | 3;
  firstTryPar: boolean;
  /** Best build, so a returning player sees their structure. */
  build: number[][];
};

export type StateResponse = {
  type: 'state';
  day: string;
  today: string;
  username: string | null;
  record: PlayRecord | null;
  streak: Streak;
  stats: DayStats;
  flairOn: boolean;
  shared: boolean;
  /** Epoch ms of the next UTC midnight (next puzzle). */
  nextAt: number;
};

export type SolveRequest = { day: string; build: number[][]; firstTry: boolean };

export type SolveResponse = {
  type: 'solve';
  ok: boolean;
  error?: string;
  blocks: number;
  par: number;
  stars: 1 | 2 | 3;
  /** True if this solve improved the stored best. */
  improved: boolean;
  record: PlayRecord | null;
  streak: Streak;
  stats: DayStats;
  /** Share of other players this result beats (0–100), null when alone. */
  beats: number | null;
  saved: boolean;
};

export type ShareResponse = { type: 'share'; ok: boolean; error?: string };
export type FlairResponse = { type: 'flair'; ok: boolean; on: boolean; text?: string; error?: string };
