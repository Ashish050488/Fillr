import React from 'react';

/** Numbers on one line ("3 this week · 12 total · 2 interviews") instead of three big boxes. */
export default function StatStrip({ stats }: { stats: Array<{ value: number; label: string }> }) {
  return (
    <p className="stat-strip">
      {stats.map((stat) => (
        <span key={stat.label}>
          <b>{stat.value}</b> {stat.label}
        </span>
      ))}
    </p>
  );
}
