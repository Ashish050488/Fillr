import React, { useState } from 'react';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { Job, LinkedInCoach, Profile } from '../../../shared/types';
import Icon from '../../components/Icon';
import { useStoredValue } from '../../hooks/useStoredValue';
import { openInCurrentTab } from '../../services/active-tab-bridge';
import CustomPeopleSearch from './CustomPeopleSearch';
import { buildQuickSearches } from './quick-people-searches';
import { SUBMITTED_STATUSES } from './tracker-filters';

const COACH_STORAGE_KEY = 'jobfill_linkedin_coach_v1';
const RECENT_APPLICATION_COUNT = 5;

/**
 * Who to look for, one click each: engineers at the companies you applied to, founders and CTOs
 * in your stack, managers and recruiters near you. Opens on this tab; nothing to type.
 */
export default function FindPeople({
  onToast,
  onOpened,
}: {
  onToast: (message: string) => void;
  onOpened?: () => void;
}) {
  const profiles = useStoredValue<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const jobs = useStoredValue<Job[]>(STORAGE_KEYS.JOBS, []);
  const coachCache = useStoredValue<{ coach?: LinkedInCoach }>(COACH_STORAGE_KEY, {});
  const [isWarmOnly, setIsWarmOnly] = useState(true);
  const profile = profiles[0];
  const appliedCompanies = jobs
    .filter((job) => SUBMITTED_STATUSES.includes(job.status) && job.company)
    .sort((first, second) => second.timestamp - first.timestamp)
    .slice(0, RECENT_APPLICATION_COUNT)
    .map((job) => job.company!);
  const searches = buildQuickSearches({
    skills: profile?.skills ?? [],
    city: profile?.fields.location?.value || profile?.fields.preferredLocation?.value,
    appliedCompanies,
    suggestedTitles: coachCache.coach?.titles,
    suggestedCompanies: coachCache.coach?.companies,
    isWarmOnly,
  });
  const openSearch = (url: string) => {
    void openInCurrentTab(url);
    onOpened?.();
  };

  return (
    <div className="stack-sm">
      <label className="check-row">
        <input type="checkbox" checked={isWarmOnly} onChange={(event) => setIsWarmOnly(event.target.checked)} />
        <span>
          Only people with a mutual connection <small className="muted">(most likely to reply)</small>
        </span>
      </label>
      <div className="list">
        {searches.map((search) => (
          <button key={search.label} type="button" className="row-compact" onClick={() => openSearch(search.url)}>
            <span className="row-title">{search.label}</span>
            <span className="row-side">
              <Icon name="arrow" />
            </span>
          </button>
        ))}
      </div>
      <details className="sheet flat collapsible-section">
        <summary className="row between">
          <span className="section-title">
            Custom search <small>any country, your words</small>
          </span>
        </summary>
        <CustomPeopleSearch onToast={onToast} />
      </details>
    </div>
  );
}
