// Tiny synthesized sound set. No audio files, no network.

let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem('tl:muted') === '1';
} catch {
  /* storage blocked */
}

export const isMuted = () => muted;

export const setMuted = (m: boolean) => {
  muted = m;
  try {
    localStorage.setItem('tl:muted', m ? '1' : '0');
  } catch {
    /* storage blocked */
  }
};

/** Must be called from a user gesture before sounds can play on iOS. */
export const unlockAudio = () => {
  if (ctx || muted) return;
  try {
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
};

const tone = (freq: number, dur: number, type: OscillatorType, vol: number, when = 0) => {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
};

export const sfx = {
  place: (level: number) => tone(300 + level * 70, 0.09, 'triangle', 0.07),
  remove: (level: number) => tone(240 - level * 25, 0.08, 'sine', 0.06),
  bump: () => tone(130, 0.12, 'square', 0.03),
  match: () => tone(988, 0.16, 'sine', 0.04, 0.02),
  solve: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.3, 'sine', 0.06, k * 0.09)),
  par: () => [784, 988, 1175, 1568].forEach((f, k) => tone(f, 0.35, 'triangle', 0.05, k * 0.08)),
};
