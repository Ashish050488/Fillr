import type { FormQuestion } from '../../../shared/types';

/** Post-edit so answers read like a person wrote them, whatever the model did. */
export function humanize(modelText: string): string {
  return (
    modelText
      .replace(/\*\*|__|`/g, '')
      .replace(/^\s*[-*•]\s+/gm, '')
      .replace(/\s*(?:—|–|―|--+)\s*/g, ', ')
      .replace(/(\w)\s+-\s+(\w)/g, '$1, $2')
      // "design/build" reads as AI shorthand; leave URLs, paths and acronyms like CI/CD alone.
      .replace(/\S+/g, (token) =>
        /[.:@]|^\//.test(token)
          ? token
          : token.replace(/^([a-z]{2,})\/([a-z]{2,})$/, (_match, firstWord: string, secondWord: string) =>
              firstWord === 'and' && secondWord === 'or' ? 'or' : `${firstWord} or ${secondWord}`,
            ),
      )
      .replace(/,\s*,/g, ',')
      .replace(/,\s*([.!?])/g, '$1')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

/** Keep only answers to questions that were asked; choices must match an offered option exactly. */
export function cleanModelAnswers(
  questions: FormQuestion[],
  answersById: Record<string, string>,
): Record<string, string> {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const cleanedAnswers: Record<string, string> = {};
  for (const [questionId, modelAnswer] of Object.entries(answersById)) {
    const question = questionsById.get(questionId);
    if (!question) continue;
    const cleanedAnswer = question.kind === 'choice' ? modelAnswer.trim() : humanize(modelAnswer);
    if (!cleanedAnswer || (question.kind === 'choice' && !question.options?.includes(cleanedAnswer))) continue;
    cleanedAnswers[questionId] = question.maxLength ? cleanedAnswer.slice(0, question.maxLength) : cleanedAnswer;
  }
  return cleanedAnswers;
}
