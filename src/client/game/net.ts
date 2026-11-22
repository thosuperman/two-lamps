import type { FlairResponse, ShareResponse, SolveRequest, SolveResponse, StateResponse } from '../../shared/api.ts';

const json = async <T,>(res: Response): Promise<T> => {
  const data: T = await res.json();
  return data;
};

export const fetchState = async (day: string): Promise<StateResponse | null> => {
  try {
    const res = await fetch(`/api/state?day=${encodeURIComponent(day)}`);
    if (!res.ok) return null;
    return await json<StateResponse>(res);
  } catch {
    return null;
  }
};

const post = async <T,>(path: string, body: object): Promise<T | null> => {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await json<T>(res);
  } catch {
    return null;
  }
};

export const submitSolve = (req: SolveRequest) => post<SolveResponse>('/api/solve', req);
export const shareComment = (day: string) => post<ShareResponse>('/api/share', { day });
export const setFlair = (on: boolean) => post<FlairResponse>('/api/flair', { on });

// Local progress (in-flight build). Devvit wipes localStorage on app updates,
// so this is only a convenience; the server holds the real record.
type Local = { build: number[][]; firstTry: boolean };

export const loadLocal = (day: string): Local | null => {
  try {
    const raw = localStorage.getItem(`tl:build:${day}`);
    if (!raw) return null;
    const v: Local = JSON.parse(raw);
    return Array.isArray(v.build) ? v : null;
  } catch {
    return null;
  }
};

export const saveLocal = (day: string, v: Local) => {
  try {
    localStorage.setItem(`tl:build:${day}`, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
};

export const seenFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(`tl:seen:${key}`) === '1';
  } catch {
    return false;
  }
};

export const setSeen = (key: string) => {
  try {
    localStorage.setItem(`tl:seen:${key}`, '1');
  } catch {
    /* storage blocked */
  }
};
