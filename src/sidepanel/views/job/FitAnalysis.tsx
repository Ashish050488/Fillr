import React, { useState } from 'react';
import type { Job } from '../../../shared/types';
import Icon from '../../components/Icon';
import ScoreRing from '../../components/ScoreRing';

const VERDICT_LABELS: Record<string, string> = {
  strong: 'Strong match',
  good: 'Good match',
  stretch: 'A stretch',
  weak: 'Weak match',
};

type FitTab = 'blockers' | 'fit' | 'gaps' | 'tips' | 'words';

function PointList({ icon, points }: { icon: React.ReactNode; points: string[] }) {
  return (
    <ul className="points">
      {points.map((point) => (
        <li key={point}>
          {icon}
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Your fit for this job: score and verdict always visible; what matches, gaps, dealbreakers,
 * tips and keywords as tabs with counts, so one list shows at a time instead of a long scroll.
 */
export default function FitAnalysis({ job, onRecheck, isBusy }: { job: Job; onRecheck: () => void; isBusy: boolean }) {
  const fit = job.analysis!;
  const tabs = (
    [
      ['blockers', 'Dealbreakers', fit.dealbreakers.length],
      ['fit', 'Why you fit', fit.matches.length],
      ['gaps', 'Gaps', fit.gaps.length],
      ['tips', 'Tips', fit.tips.length],
      ['words', 'Keywords', fit.keywords.length],
    ] as Array<[FitTab, string, number]>
  ).filter(([, , count]) => count > 0);
  const [chosenTab, setChosenTab] = useState<FitTab>();
  // Dealbreakers open first when there are any; otherwise why you fit.
  const activeTab = chosenTab && tabs.some(([tab]) => tab === chosenTab) ? chosenTab : tabs[0]?.[0];

  return (
    <section className="stack-sm">
      <div className="sheet alt fit">
        <ScoreRing score={fit.score} />
        <div className="stack-sm">
          <p className="verdict">{VERDICT_LABELS[fit.verdict] ?? fit.verdict}</p>
          <p className="soft">{fit.headline}</p>
        </div>
      </div>
      {tabs.length > 0 && (
        <div className="segments" role="tablist" aria-label="Fit details">
          {tabs.map(([tab, label, count]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              className="segment"
              aria-selected={activeTab === tab}
              onClick={() => setChosenTab(tab)}
            >
              {label} <span className="count">{count}</span>
            </button>
          ))}
        </div>
      )}
      <div role="tabpanel" className="fit-panel">
        {activeTab === 'blockers' && <PointList icon={<Icon name="warning" />} points={fit.dealbreakers} />}
        {activeTab === 'fit' && (
          <ul className="points">
            {fit.matches.map((match) => (
              <li key={match.requirement}>
                <Icon name="tick" />
                <span>
                  <b>{match.requirement}</b>
                  <span className="muted">{match.evidence}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {activeTab === 'gaps' && <PointList icon={<Icon name="cross" />} points={fit.gaps} />}
        {activeTab === 'tips' && <PointList icon={<Icon name="arrow" />} points={fit.tips} />}
        {activeTab === 'words' && (
          <div className="stack-sm">
            <p className="muted small">You have them and they want them: use them in your answers.</p>
            <div className="chips">
              {fit.keywords.map((keyword) => (
                <span className="chip" key={keyword}>
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="row">
        <button className="link" type="button" disabled={isBusy} onClick={onRecheck}>
          Re-check this job
        </button>
      </div>
    </section>
  );
}
