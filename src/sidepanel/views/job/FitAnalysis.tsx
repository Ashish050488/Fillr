import React from 'react';
import type { Job } from '../../../shared/types';
import Icon from '../../components/Icon';
import ScoreRing from '../../components/ScoreRing';

const VERDICT_LABELS: Record<string, string> = {
  strong: 'Strong match',
  good: 'Good match',
  stretch: 'A stretch',
  weak: 'Weak match',
};

function FitPoints({ title, icon, points }: { title: string; icon: React.ReactNode; points: string[] }) {
  return (
    <section className="stack-sm">
      <p className="section-title">{title}</p>
      <ul className="points">
        {points.map((point) => (
          <li key={point}>
            {icon}
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Your fit for this job: score, verdict, what matches, gaps, dealbreakers, tips and keywords. */
export default function FitAnalysis({ job, onRecheck, isBusy }: { job: Job; onRecheck: () => void; isBusy: boolean }) {
  const fit = job.analysis!;
  return (
    <section className="stack">
      <div className="sheet alt fit">
        <ScoreRing score={fit.score} />
        <div className="stack-sm">
          <p className="verdict">{VERDICT_LABELS[fit.verdict] ?? fit.verdict}</p>
          <p className="soft">{fit.headline}</p>
        </div>
      </div>
      {fit.dealbreakers.length > 0 && (
        <FitPoints title="Possible dealbreakers" icon={<Icon name="warning" />} points={fit.dealbreakers} />
      )}
      {fit.matches.length > 0 && (
        <section className="stack-sm">
          <p className="section-title">Why you fit</p>
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
        </section>
      )}
      {fit.gaps.length > 0 && <FitPoints title="Gaps" icon={<Icon name="cross" />} points={fit.gaps} />}
      {fit.tips.length > 0 && <FitPoints title="When you apply" icon={<Icon name="arrow" />} points={fit.tips} />}
      {fit.keywords.length > 0 && (
        <section className="stack-sm">
          <p className="section-title">
            Say these words <small>you have them, they want them</small>
          </p>
          <div className="chips">
            {fit.keywords.map((keyword) => (
              <span className="chip" key={keyword}>
                {keyword}
              </span>
            ))}
          </div>
        </section>
      )}
      <div className="row">
        <button className="link" type="button" disabled={isBusy} onClick={onRecheck}>
          Re-check this job
        </button>
      </div>
    </section>
  );
}
