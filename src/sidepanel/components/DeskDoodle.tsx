import React from 'react';

/** A desk doodle for empty states: a sheet with a pencil resting on it. */
export default function DeskDoodle() {
  return (
    <svg
      className="doodle"
      viewBox="0 0 120 90"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12c18-1.4 36-1.2 54 .3 1 19 .8 40-.6 62-17.6 1-35.4.9-53.4-.4C20.6 54 20.8 33 22 12z" />
      <path d="M32 28c10-.6 21-.5 32 .2M32 39c12-.4 23-.3 34 .3M32 50c7-.3 13-.2 19 .2" />
      <path d="M70 70l30-34c2.4-2.4 5.8-1 6.6.8.8 2-.3 3.6-1.6 5L75 76l-8 3.4z" />
      <path d="M96 40l6.4 5.4M8 82c30-1.6 66-1.8 104-.4" strokeDasharray="2 5" />
    </svg>
  );
}
