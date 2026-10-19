import React, { useEffect, useState } from 'react';
import type { ProfileBoostSuggestion } from '../../../shared/types';
import Icon from '../../components/Icon';

type PutState = 'idle' | 'busy' | 'done';

/**
 * One profile box: what it says now (one quiet line) and the rewrite, editable before it goes in.
 * "Put in page" types it into the box on the site; you still press the site's Save.
 */
export default function BoostSuggestionCard({
  suggestion,
  onPut,
  onCopy,
}: {
  suggestion: ProfileBoostSuggestion;
  onPut: (suggestion: ProfileBoostSuggestion) => Promise<boolean>;
  onCopy: (text: string) => void;
}) {
  const [draft, setDraft] = useState(suggestion.suggested);
  const [putState, setPutState] = useState<PutState>('idle');
  useEffect(() => {
    setDraft(suggestion.suggested);
    setPutState('idle');
  }, [suggestion.suggested]);
  const isOverLimit = Boolean(suggestion.maxLength && draft.length > suggestion.maxLength);

  const handlePut = async () => {
    setPutState('busy');
    const isPut = await onPut({ ...suggestion, suggested: draft });
    setPutState(isPut ? 'done' : 'idle');
  };

  return (
    <article className="boost-card stack-sm">
      <div className="row between">
        <span className="section-title">{suggestion.label}</span>
        <span className={`tiny${isOverLimit ? ' over-limit' : ''}`}>
          {draft.length}
          {suggestion.maxLength ? `/${suggestion.maxLength}` : ''}
        </span>
      </div>
      <p className="boost-current muted small" title={suggestion.current}>
        {suggestion.current.trim() ? `Now: ${suggestion.current}` : 'Now: empty'}
      </p>
      <textarea
        className="boost-draft"
        value={draft}
        rows={Math.min(8, Math.max(2, Math.ceil(draft.length / 48)))}
        aria-label={`New text for ${suggestion.label}`}
        onChange={(event) => {
          setDraft(event.target.value);
          setPutState('idle');
        }}
      />
      <div className="row">
        <button
          className="btn primary"
          type="button"
          disabled={putState === 'busy' || !draft.trim()}
          aria-busy={putState === 'busy'}
          onClick={() => void handlePut()}
        >
          {putState === 'done' ? (
            <>
              <Icon name="tick" /> In the page
            </>
          ) : (
            'Put in page'
          )}
        </button>
        <button className="btn quiet" type="button" onClick={() => onCopy(draft)}>
          Copy
        </button>
      </div>
    </article>
  );
}
