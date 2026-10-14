import React from 'react';
import { drawRoughCirclePath } from './draw-rough-circle';

/** The fit score in a hand-drawn ring that fills in like a pen stroke. */
export default function ScoreRing({ score, size = 'big' }: { score: number; size?: 'big' | 'mini' }) {
  const scorePath = drawRoughCirclePath(50, 50, 42, score % 7);
  if (size === 'mini') {
    return (
      <span className="mini-ring" title={`${score}% fit`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path
            d={scorePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - score}
          />
        </svg>
        {score}
      </span>
    );
  }
  return (
    <div className="ring" role="img" aria-label={`${score} percent fit`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d={drawRoughCirclePath(50, 50, 42, 3)} fill="none" stroke="var(--rule)" strokeWidth="2" />
        <path
          className="draw"
          d={scorePath}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="4.5"
          strokeLinecap="round"
          pathLength={100}
          style={{ '--len': 100, '--to': 100 - score } as React.CSSProperties}
        />
      </svg>
      <div className="num">
        {score}
        <small>% fit</small>
      </div>
    </div>
  );
}
