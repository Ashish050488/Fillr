import React from 'react';
import type { LinkedInCoach } from '../../../shared/types';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';

/** Today's AI suggestions: three kinds of people to message and three actions (the focus line sits above). */
export default function CoachPlan({
  coach,
  isLoading,
  errorMessage,
  onRefresh,
}: {
  coach?: LinkedInCoach;
  isLoading: boolean;
  errorMessage: string;
  onRefresh: () => void;
}) {
  return (
    <div className="stack-sm">
      {isLoading && (
        <p className="soft small">
          <Spinner /> Looking at your profile and applications…
        </p>
      )}
      {errorMessage && <p className="small">{errorMessage}</p>}
      {coach && (
        <>
          <ul className="points">
            {coach.people.map((line) => (
              <li key={line}>
                <Icon name="arrow" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="section-title">Today</p>
          <ul className="points">
            {coach.plan.map((line) => (
              <li key={line}>
                <Icon name="tick" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="row between">
        <span className="muted small">
          {coach
            ? `Written ${new Date(coach.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : ''}
        </span>
        <button className="link" type="button" disabled={isLoading} onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </div>
  );
}
