import { normalise } from '../form/match-profile-field';

const YES_ANSWER = /^(yes|y|true|i do|i am|authori[sz]ed|eligible)\b/;
const NO_ANSWER = /^(no|n|false|i do not|i don ?t|not)\b/;
const DECLINE_ANSWER =
  /\b(decline|prefer not|not to (say|disclose|answer|self identify|identify)|do not wish|don ?t wish|rather not|choose not)\b/;
const COUNTRY_ALIASES: Array<[RegExp, string[]]> = [
  [
    /^(us|usa|u s a|united states|united states of america|america)$/,
    ['united states', 'usa', 'us', 'united states of america'],
  ],
  [/^(uk|u k|united kingdom|great britain|britain|england)$/, ['united kingdom', 'uk', 'great britain']],
  [/^(india|bharat|in)$/, ['india']],
  [/^(uae|united arab emirates)$/, ['united arab emirates', 'uae']],
];

/** Best dropdown option for a free-text answer: exact, country alias, yes/no, then a unique partial match. */
export function matchOption(options: string[], answer: string): string | undefined {
  const wantedText = normalise(answer);
  if (!wantedText) return undefined;
  const exactOption = options.find((option) => normalise(option) === wantedText);
  if (exactOption) return exactOption;
  for (const [aliasPattern, countryNames] of COUNTRY_ALIASES) {
    if (!aliasPattern.test(wantedText)) continue;
    const countryOption = options.find((option) => countryNames.includes(normalise(option)));
    if (countryOption) return countryOption;
  }
  if (YES_ANSWER.test(wantedText) || NO_ANSWER.test(wantedText)) {
    const answerPattern = YES_ANSWER.test(wantedText) ? YES_ANSWER : NO_ANSWER;
    const answerOptions = options.filter((option) => answerPattern.test(normalise(option)));
    if (answerOptions.length === 1) return answerOptions[0];
  }
  const partialOptions = options.filter((option) => {
    const optionText = normalise(option);
    return optionText.length > 1 && (optionText.includes(wantedText) || wantedText.includes(optionText));
  });
  return partialOptions.length === 1 ? partialOptions[0] : undefined;
}

/** For demographic questions JobFill never guesses: pick "Decline to self-identify" when offered. */
export function declineOption(options: string[]): string | undefined {
  return options.find((option) => DECLINE_ANSWER.test(normalise(option)));
}
