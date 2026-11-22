import { useEffect, useLayoutEffect, useRef, type MutableRefObject } from 'react';
import type { Grid, Rules } from '../../shared/engine.ts';
import { cellAt, computeLayout, drawScene, spawnSparks, wallHeight, type Cell, type Layout, type SceneState } from './scene.ts';

export type TapKind = 'add' | 'remove';

type Props = {
  puzzle: Rules;
  h: Grid<number>;
  hintTile: Cell | null;
  lit: boolean;
  solvedAt: number | null;
  interactive: boolean;
  mode: TapKind;
  padTop?: number;
  padBottom?: number;
  /** Returns the new build (applied to the scene at once, so rapid taps hit-test correctly). */
  onTap?: (cell: Cell, kind: TapKind) => Grid<number> | null;
  /** Set when the tapped tile cannot take a block (rock or too tall). */
  rejectRef?: MutableRefObject<((cell: Cell) => void) | null>;
  dropRef?: MutableRefObject<((cell: Cell) => void) | null>;
  /** The game's synchronous build. When given, it is the source of truth for drawing and hit-testing. */
  buildRef?: MutableRefObject<Grid<number>>;
};

const LONG_PRESS_MS = 420;

export const Board = ({
  puzzle,
  h,
  hintTile,
  lit,
  solvedAt,
  interactive,
  mode,
  padTop = 8,
  padBottom = 8,
  onTap,
  rejectRef,
  dropRef,
  buildRef,
}: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<Layout | null>(null);
  const sceneRef = useRef<SceneState>({
    puzzle,
    h,
    hover: null,
    hintTile,
    drop: null,
    shake: null,
    solvedAt,
    lit,
    sparks: [],
  });
  const propsRef = useRef({ onTap, mode, interactive });

  // Keep the scene and handlers in sync with props without restarting the loop.
  useLayoutEffect(() => {
    propsRef.current = { onTap, mode, interactive };
    const s = sceneRef.current;
    s.puzzle = puzzle;
    s.h = buildRef?.current ?? h;
    s.hintTile = hintTile;
    s.lit = lit;
    if (solvedAt !== s.solvedAt) {
      s.solvedAt = solvedAt;
      if (solvedAt && layoutRef.current) spawnSparks(layoutRef.current, s);
    }
  });

  useEffect(() => {
    if (rejectRef) rejectRef.current = (c) => (sceneRef.current.shake = { ...c, t0: performance.now() });
    if (dropRef) dropRef.current = (c) => (sceneRef.current.drop = { ...c, t0: performance.now() });
  }, [rejectRef, dropRef]);

  // Size the canvas to its container.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      layoutRef.current = computeLayout(r.width, r.height, puzzle.n, wallHeight(puzzle), padTop, padBottom);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [puzzle, padTop, padBottom]);

  // Render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const L = layoutRef.current;
      if (L) {
        const sc = sceneRef.current;
        if (buildRef) sc.h = buildRef.current;
        drawScene(ctx, L, sc, t, t - last);
      }
      last = t;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [buildRef]);

  // Input: tap to build (or remove in remove mode); long-press or right-click to remove.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let timer: number | null = null;
    let pressed: Cell | null = null;
    let sx = 0;
    let sy = 0;
    const at = (e: PointerEvent): Cell | null => {
      const L = layoutRef.current;
      if (!L) return null;
      const r = canvas.getBoundingClientRect();
      const h = buildRef ? buildRef.current : sceneRef.current.h;
      return cellAt(L, h, e.clientX - r.left, e.clientY - r.top);
    };
    const fire = (c: Cell, kind: TapKind) => {
      const next = propsRef.current.onTap?.(c, kind);
      if (next && !buildRef) sceneRef.current.h = next;
    };
    const down = (e: PointerEvent) => {
      if (!propsRef.current.interactive) return;
      const c = at(e);
      if (!c) return;
      if (e.button === 2) {
        fire(c, 'remove');
        return;
      }
      pressed = c;
      sx = e.clientX;
      sy = e.clientY;
      timer = window.setTimeout(() => {
        timer = null;
        if (pressed) fire(pressed, 'remove');
        pressed = null;
        navigator.vibrate?.(12);
      }, LONG_PRESS_MS);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') sceneRef.current.hover = propsRef.current.interactive ? at(e) : null;
      if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) {
        clearTimeout(timer);
        timer = null;
        pressed = null;
      }
    };
    const up = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        if (pressed) fire(pressed, propsRef.current.mode);
      }
      pressed = null;
    };
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      pressed = null;
    };
    const leave = () => (sceneRef.current.hover = null);
    const menu = (e: Event) => e.preventDefault();
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('contextmenu', menu);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('contextmenu', menu);
    };
  }, [buildRef]);

  return (
    <div ref={wrapRef} className="board">
      <canvas ref={canvasRef} className="board-canvas" />
    </div>
  );
};
