import React from 'react';
import Icon from '../../components/Icon';
import { useSavedAnswers } from '../../hooks/useSavedAnswers';
import StandardAnswers, { standardAnswerKey } from './StandardAnswers';
import { DECLARATION_TOPICS } from '../../../shared/answers/declaration-topics';

const STANDARD_KEYS = new Set(DECLARATION_TOPICS.map(standardAnswerKey));

/** "topic:work-permit@india" reads as "Work permit · India". */
function describeKey(answerKey: string): string | undefined {
  const topicMatch = /^topic:([a-z-]+)(?:@(.+))?$/.exec(answerKey);
  if (!topicMatch) return undefined;
  const topicName = topicMatch[1].replace(/-/g, ' ');
  const readableTopic = topicName.charAt(0).toUpperCase() + topicName.slice(1);
  const countryName = topicMatch[2] && topicMatch[2] !== 'any' ? topicMatch[2] : undefined;
  return countryName
    ? `${readableTopic} · ${countryName.replace(/\b\w/g, (letter) => letter.toUpperCase())}`
    : readableTopic;
}

/**
 * Standard answers you set here, plus answers given on a form for one country or one
 * company's own question. JobFill reuses all of them on later applications.
 */
export default function SavedAnswers() {
  const { savedAnswers, saveAnswer, forgetAnswer } = useSavedAnswers();
  const otherAnswers = savedAnswers.filter((savedAnswer) => !STANDARD_KEYS.has(savedAnswer.key));

  return (
    <>
      <StandardAnswers
        savedAnswers={savedAnswers}
        onSave={(key, label, answer) => void saveAnswer(key, label, answer)}
        onForget={(key) => void forgetAnswer(key)}
      />
      {otherAnswers.length > 0 && (
        <section className="stack-sm">
          <p className="section-title">
            Answers from forms <small>for one country or one company's own question</small>
          </p>
          <div className="sheet flat list">
            {otherAnswers.map((savedAnswer) => (
              <div className="item saved-answer" key={savedAnswer.key}>
                <div className="saved-answer-text">
                  {describeKey(savedAnswer.key) && <span className="pfield-tag">{describeKey(savedAnswer.key)}</span>}
                  <p className="saved-answer-question" title={savedAnswer.label}>
                    {savedAnswer.label.replace(/\*\s*$/, '')}
                  </p>
                  <b>{savedAnswer.answer}</b>
                </div>
                <button
                  className="btn icon quiet"
                  type="button"
                  aria-label="Forget this answer"
                  title="Forget this answer"
                  onClick={() => void forgetAnswer(savedAnswer.key)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
