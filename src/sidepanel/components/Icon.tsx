import React from 'react';
import { ICON_PATHS, type IconName } from './icon-paths';

/** A hand-drawn icon in the current text colour. Decorative: screen readers skip it. */
export default function Icon({ name }: { name: IconName }) {
  const iconDrawing = ICON_PATHS[name];
  return (
    <svg viewBox={iconDrawing.viewBox} aria-hidden="true">
      {iconDrawing.paths.map((pathData) => (
        <path
          key={pathData}
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth={iconDrawing.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {name === 'warning' && <circle cx="10.2" cy="16.6" r="1.4" fill="currentColor" />}
    </svg>
  );
}
