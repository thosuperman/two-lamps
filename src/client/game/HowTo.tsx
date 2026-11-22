import { Close } from './icons.tsx';

const Cube = ({ x, y, s = 14 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M0 0 L${s} ${-s / 2} L${2 * s} 0 L${s} ${s / 2} Z`} fill="#fcefd6" stroke="#3c1e0e" strokeOpacity="0.5" />
    <path d={`M0 0 L${s} ${s / 2} L${s} ${s * 1.7} L0 ${s * 1.2} Z`} fill="#d99a63" stroke="#3c1e0e" strokeOpacity="0.5" />
    <path d={`M${2 * s} 0 L${s} ${s / 2} L${s} ${s * 1.7} L${2 * s} ${s * 1.2} Z`} fill="#b26e43" stroke="#3c1e0e" strokeOpacity="0.5" />
  </g>
);

const StepTap = () => (
  <svg viewBox="0 0 120 80" className="howto-art" aria-hidden="true">
    <path d="M20 52 L60 32 L100 52 L60 72 Z" fill="#54476e" />
    <Cube x={46} y={38} />
    <Cube x={46} y={21} />
    <circle cx="86" cy="22" r="9" fill="none" stroke="#ffc94a" strokeWidth="2" />
    <circle cx="86" cy="22" r="3" fill="#ffc94a" />
  </svg>
);

const StepShadow = () => (
  <svg viewBox="0 0 120 80" className="howto-art" aria-hidden="true">
    <rect x="18" y="10" width="84" height="56" rx="3" fill="#f3ddb0" />
    <path d="M30 66 V42 H48 V26 H66 V50 H84 V66" fill="none" stroke="#7c5634" strokeWidth="2" strokeDasharray="5 4" />
    <path d="M30 66 V42 H48 V26 H66 V66 Z" fill="#2a2040" opacity="0.9" />
    <path d="M30 42 H66" stroke="#ffc94a" strokeWidth="3" />
    <circle cx="39" cy="6" r="3" fill="#ffc94a" />
    <circle cx="57" cy="6" r="3" fill="#ffc94a" />
    <circle cx="75" cy="6" r="3" fill="none" stroke="#f6ead7" strokeWidth="1.5" />
  </svg>
);

const StepTower = () => (
  <svg viewBox="0 0 120 80" className="howto-art" aria-hidden="true">
    <path d="M20 56 L60 36 L100 56 L60 76 Z" fill="#54476e" />
    <Cube x={46} y={44} />
    <Cube x={46} y={27} />
    <Cube x={46} y={10} />
    <path d="M14 30 l12 -6 M106 30 l-12 -6" stroke="#ffc94a" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const HowTo = ({ onClose, twistHint }: { onClose: () => void; twistHint: string | null }) => (
  <div className="overlay" role="dialog" aria-label="How to play" onClick={onClose}>
    <div className="howto" onClick={(e) => e.stopPropagation()}>
      <button className="sheet-close" onClick={onClose} aria-label="Close">
        <Close />
      </button>
      <h2 className="howto-title">How to play</h2>
      <ol className="howto-steps">
        <li>
          <StepTap />
          <div>
            <b>Tap to stack.</b> Long-press to take one off.
          </div>
        </li>
        <li>
          <StepShadow />
          <div>
            <b>Fill each dashed shadow</b> exactly. Lights turn gold when a column fits.
          </div>
        </li>
        <li>
          <StepTower />
          <div>
            <b>Use as few blocks as you can.</b> One tall tower can shade both walls.
          </div>
        </li>
      </ol>
      {twistHint && <div className="howto-twist">Today: {twistHint}</div>}
      <button className="btn btn-primary wide" onClick={onClose}>
        Let’s build
      </button>
    </div>
  </div>
);
