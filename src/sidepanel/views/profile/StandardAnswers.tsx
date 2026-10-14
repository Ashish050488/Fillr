import React from 'react';
import { DECLARATION_TOPICS, type DeclarationTopic } from '../../../shared/answers/declaration-topics';
import Dropdown from '../../components/Dropdown';
import type { SavedAnswer } from '../../hooks/useSavedAnswers';

const NOT_SET = '';
const YES_NO_OPTIONS = [
  { value: NOT_SET, label: 'Ask me' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

/** The key an every-country answer is stored under; a country's own answer still wins over it. */
export const standardAnswerKey = (declaration: DeclarationTopic) =>
  `topic:${declaration.topic}${declaration.isCountrySpecific ? '@any' : ''}`;

/**
 * The legal and screening questions Workday and other ATSs ask on almost every application.
 * Set them once here and JobFill answers them the same way everywhere.
 */
export default function StandardAnswers({
  savedAnswers,
  onSave,
  onForget,
}: {
  savedAnswers: SavedAnswer[];
  onSave: (key: string, label: string, answer: string) => void;
  onForget: (key: string) => void;
}) {
  const answersByKey = new Map(savedAnswers.map((savedAnswer) => [savedAnswer.key, savedAnswer.answer]));
  const answeredCount = DECLARATION_TOPICS.filter((declaration) =>
    answersByKey.has(standardAnswerKey(declaration)),
  ).length;

  return (
    <details className="sheet flat collapsible-section">
      <summary className="row between">
        <span className="section-title">
          Standard answers <small>work permit, sponsorship, non-compete… filled the same everywhere</small>
        </span>
        <span className="small soft">
          {answeredCount}/{DECLARATION_TOPICS.length}
        </span>
      </summary>
      <div className="standard-answers">
        {DECLARATION_TOPICS.map((declaration) => {
          const answerKey = standardAnswerKey(declaration);
          const inputId = `standard-answer-${declaration.topic}`;
          return (
            <div className="standard-answer" key={declaration.topic}>
              <label className="standard-answer-question" htmlFor={inputId}>
                {declaration.title}
              </label>
              <Dropdown
                id={inputId}
                isCompact
                value={answersByKey.get(answerKey) ?? NOT_SET}
                options={YES_NO_OPTIONS}
                onChange={(answer) =>
                  answer === NOT_SET ? onForget(answerKey) : onSave(answerKey, declaration.title, answer)
                }
              />
            </div>
          );
        })}
      </div>
      <p className="muted small standard-answers-note">
        "Ask me" leaves the question for you on the form. A typed sponsorship question gets "N/A" when you choose No.
      </p>
    </details>
  );
}
