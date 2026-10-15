import React, { useState } from 'react';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { Profile } from '../../../shared/types';
import Dropdown from '../../components/Dropdown';
import Icon from '../../components/Icon';
import { useStoredValue } from '../../hooks/useStoredValue';
import { openInCurrentTab } from '../../services/active-tab-bridge';
import { copyText } from '../../services/text-export';
import {
  buildGoogleXraySearch,
  buildLinkedInSearchUrl,
  googleSearchUrl,
  PEOPLE_TARGETS,
  SEARCH_COUNTRIES,
  type PeopleTarget,
} from './people-search-queries';

const SUGGESTED_KEYWORD_COUNT = 3;

/**
 * Your own search for founders, CTOs, managers, recruiters or engineers in any country. It opens in
 * the tab you are on, in LinkedIn or Google (which can search public profiles country by country).
 */
export default function CustomPeopleSearch({ onToast }: { onToast: (message: string) => void }) {
  const profiles = useStoredValue<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const suggestedKeywords = (profiles[0]?.skills ?? []).slice(0, SUGGESTED_KEYWORD_COUNT).join(', ');
  const [target, setTarget] = useState<PeopleTarget>('founders');
  const [countryName, setCountryName] = useState('Anywhere');
  const [keywords, setKeywords] = useState<string>();
  const [company, setCompany] = useState('');
  const [city, setCity] = useState('');
  const country = SEARCH_COUNTRIES.find((candidate) => candidate.name === countryName) ?? SEARCH_COUNTRIES[0];
  const request = { target, country, keywords: keywords ?? suggestedKeywords, company, city };
  const googleQuery = buildGoogleXraySearch(request);

  return (
    <div className="stack-sm">
      <div className="pgrid">
        <label className="pfield">
          <span className="pfield-head">Who</span>
          <Dropdown
            ariaLabel="Who to find"
            value={target}
            options={Object.entries(PEOPLE_TARGETS).map(([value, { label }]) => ({ value, label }))}
            onChange={(value) => setTarget(value as PeopleTarget)}
          />
        </label>
        <label className="pfield">
          <span className="pfield-head">Country</span>
          <Dropdown
            ariaLabel="Country"
            value={countryName}
            options={SEARCH_COUNTRIES.map(({ name }) => ({ value: name, label: name }))}
            onChange={setCountryName}
          />
        </label>
        <label className="pfield pfield-full">
          <span className="pfield-head">Your field or stack</span>
          <input
            className="input"
            value={keywords ?? suggestedKeywords}
            placeholder="e.g. AI, fintech, React"
            onChange={(event) => setKeywords(event.target.value)}
          />
        </label>
        <label className="pfield">
          <span className="pfield-head">Company (optional)</span>
          <input
            className="input"
            value={company}
            placeholder="e.g. Stripe"
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
        <label className="pfield">
          <span className="pfield-head">City (optional)</span>
          <input
            className="input"
            value={city}
            placeholder="e.g. Berlin"
            onChange={(event) => setCity(event.target.value)}
          />
        </label>
      </div>
      <div className="row">
        <button
          className="btn primary"
          type="button"
          onClick={() => void openInCurrentTab(buildLinkedInSearchUrl(request))}
        >
          Search LinkedIn
        </button>
        <button className="btn" type="button" onClick={() => void openInCurrentTab(googleSearchUrl(googleQuery))}>
          Search Google
        </button>
        <button
          className="btn icon quiet"
          type="button"
          aria-label="Copy the Google search"
          title="Copy the Google search"
          onClick={() => void copyText(googleQuery).then(() => onToast('Copied'))}
        >
          <Icon name="copy" />
        </button>
      </div>
      <p className="muted small">
        Google searches public profiles on that country’s LinkedIn, so it finds people LinkedIn’s own search hides.
      </p>
    </div>
  );
}
