// Hand-drawn inline icons (no icon font, no network).
type P = { size?: number };

export const Lantern = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <radialGradient id="lg" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stopColor="#fff2c4" />
        <stop offset="100%" stopColor="#ffb547" />
      </radialGradient>
    </defs>
    <path d="M12 2.5l5 4H7z" fill="#ffc94a" />
    <rect x="7.5" y="7" width="9" height="10" rx="1.5" fill="url(#lg)" stroke="#ffc94a" strokeWidth="1.2" />
    <path d="M9.5 7v10M14.5 7v10" stroke="#e9a43b" strokeWidth="0.8" />
    <rect x="6.5" y="17" width="11" height="2.2" rx="0.8" fill="#ffc94a" />
    <path d="M12 19.2V22" stroke="#ffc94a" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const Undo = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export const Restart = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);

export const BlockPlus = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3l8 4.5-8 4.5-8-4.5z" fill="#fcefd6" />
    <path d="M4 7.5v9l8 4.5v-9z" fill="#d99a63" />
    <path d="M20 7.5v9l-8 4.5v-9z" fill="#b26e43" />
  </svg>
);

export const BlockMinus = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l8 4.5-8 4.5-8-4.5z" strokeDasharray="2.5 2" />
    <path d="M4 7.5v9l8 4.5 8-4.5v-9" strokeDasharray="2.5 2" />
  </svg>
);

export const Help = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.4 9.2a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.3-2.6 4" />
    <circle cx="12" cy="17.6" r="0.6" fill="currentColor" />
  </svg>
);

export const Sound = ({ size = 20, off = false }: P & { off?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity="0.15" />
    {off ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M16 9a4.2 4.2 0 0 1 0 6M18.6 6.4a8 8 0 0 1 0 11.2" />}
  </svg>
);

export const Flame = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5c.6 3.2 3.2 4.6 4.6 7.3 1.9 3.6.2 9.7-4.6 9.7s-6.5-4.2-5-7.8c.6-1.4 1.6-2.3 1.9-3.9 1.3 1.2 1.6 2.4 1.6 3.4 1.6-1.9 1.9-5.4 1.5-8.7z" fill="#ff8a3d" />
    <path d="M12 12c.4 1.6 2 2.3 2 4.1 0 1.6-1 2.9-2.2 2.9s-2.3-1-2.1-2.6c.1-1 .9-1.6 1.1-2.6.6.5.9 1.1.9 1.6.5-.9.6-2.2.3-3.4z" fill="#ffd34a" />
  </svg>
);

export const ChevronUp = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 15l6-6 6 6" />
  </svg>
);

export const Close = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Comment = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5h16v11H9l-5 4z" />
  </svg>
);

export const ShareIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" />
    <path d="M5 12v7h14v-7" />
  </svg>
);
