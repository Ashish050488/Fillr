import React, { useState } from 'react';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { Job, MessageMap, ProfileBoostSuggestion } from '../../../shared/types';
import Icon from '../../components/Icon';
import Spinner from '../../components/Spinner';
import { useProfileBoost } from '../../hooks/useProfileBoost';
import { useStoredValue } from '../../hooks/useStoredValue';
import { toPage, type ActiveTab } from '../../services/active-tab-bridge';
import { copyText } from '../../services/text-export';
import BoostSuggestionCard from './BoostSuggestionCard';
import KeywordCoverage from './KeywordCoverage';

type WriteReply = MessageMap['PROFILE_PAGE_WRITE']['response'];
type SkillsReply = MessageMap['PROFILE_PAGE_ADD_SKILLS']['response'];

/**
 * On your own profile editor (Wellfound first): which searched-for skills the page is missing,
 * and an AI rewrite of every box, tailored to the jobs you check, that you put in and then Save.
 */
export default function ProfileBoostView({
  tab,
  site,
  onToast,
}: {
  tab: ActiveTab;
  site: string;
  onToast: (message: string) => void;
}) {
  const jobs = useStoredValue<Job[]>(STORAGE_KEYS.JOBS, []);
  const { scan, boost, isWriting, errorMessage, rewrite, rescan } = useProfileBoost(tab.id, tab.url);
  const [addingSkill, setAddingSkill] = useState('');
  const [addedSkills, setAddedSkills] = useState<string[]>([]);

  /** The box may have been read again since the rewrite: find it by id, then by its heading. */
  const handlePut = async (suggestion: ProfileBoostSuggestion): Promise<boolean> => {
    const pageScan = (await rescan()) ?? scan;
    const field =
      pageScan?.fields.find((candidate) => candidate.id === suggestion.fieldId) ??
      pageScan?.fields.find((candidate) => (candidate.section || candidate.label) === suggestion.label);
    const reply = field
      ? await toPage<WriteReply>(tab.id, {
          action: 'PROFILE_PAGE_WRITE',
          payload: { fieldId: field.id, value: suggestion.suggested, maxLength: suggestion.maxLength },
        }).catch(() => undefined)
      : undefined;
    if (!reply?.success) {
      onToast(reply?.error ?? `Open the section with "${suggestion.label}" and try again.`);
      return false;
    }
    void rescan();
    onToast(`Put in. Press Save on ${site}.`);
    return true;
  };

  const handleAddSkills = async (skills: string[]) => {
    setAddingSkill(skills.length === 1 ? skills[0] : 'all');
    const reply = await toPage<SkillsReply>(tab.id, {
      action: 'PROFILE_PAGE_ADD_SKILLS',
      payload: { skills },
    }).catch(() => undefined);
    setAddingSkill('');
    if (reply?.added.length) setAddedSkills((previous) => [...previous, ...reply.added]);
    onToast(
      reply?.success ? `Added ${reply.added.length}. Press Save on ${site}.` : (reply?.error ?? 'Could not add.'),
    );
    void rescan();
  };

  const pendingSkills = boost?.skillsToAdd.filter((skill) => !addedSkills.includes(skill)) ?? [];
  const textBoxCount = scan?.fields.filter((field) => field.kind === 'text').length ?? 0;
  return (
    <div className="stack fade-in">
      <header className="job-head">
        <p className="tiny">{site} profile</p>
        <h1>Rank higher in recruiter search</h1>
      </header>
      <KeywordCoverage jobs={jobs} pageText={scan?.pageText ?? ''} />
      <section className="sheet stack-sm">
        <p className="soft small">
          {scan
            ? `${textBoxCount} box${textBoxCount === 1 ? '' : 'es'} on this page. JobFill rewrites them from your resume, with the skills recruiters search for and real numbers. Nothing is saved until you press Save.`
            : 'Reading this page…'}
        </p>
        <button
          className="btn primary big block"
          type="button"
          disabled={isWriting || !scan}
          aria-busy={isWriting}
          onClick={() => void rewrite(Boolean(boost))}
        >
          {isWriting ? (
            <>
              <Spinner /> Rewriting…
            </>
          ) : boost ? (
            <>
              Rewrite again <Icon name="redo" />
            </>
          ) : (
            <>
              Tailor this page <Icon name="arrow" />
            </>
          )}
        </button>
      </section>
      {errorMessage && (
        <p className="note err" role="alert">
          {errorMessage}
        </p>
      )}
      {boost?.suggestions.map((suggestion) => (
        <BoostSuggestionCard
          key={suggestion.fieldId}
          suggestion={suggestion}
          onPut={handlePut}
          onCopy={(text) => void copyText(text).then(() => onToast('Copied'))}
        />
      ))}
      {pendingSkills.length > 0 && (
        <section className="stack-sm">
          <div className="row between">
            <span className="section-title">Skills to add</span>
            <button
              className="link"
              type="button"
              disabled={Boolean(addingSkill)}
              onClick={() => void handleAddSkills(pendingSkills)}
            >
              {addingSkill === 'all' ? 'Adding…' : 'Add all'}
            </button>
          </div>
          <div className="chips">
            {pendingSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                className="chip"
                disabled={Boolean(addingSkill)}
                aria-busy={addingSkill === skill}
                onClick={() => void handleAddSkills([skill])}
              >
                + {skill}
              </button>
            ))}
          </div>
        </section>
      )}
      {boost && boost.tips.length > 0 && (
        <section className="stack-sm">
          <span className="section-title">Also on this page</span>
          <ul className="points">
            {boost.tips.map((tip) => (
              <li key={tip}>
                <Icon name="arrow" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
