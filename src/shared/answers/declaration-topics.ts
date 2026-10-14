import { labelKey } from '../jobs/job-key';

/**
 * Statements about you that only you can make: legal status, past employment and conflicts.
 * AI never guesses these. You answer each once and JobFill reuses the answer, even when another
 * company words the question differently. Country-specific topics are remembered per country.
 */
export interface DeclarationTopic {
  topic: string;
  /** How the Profile tab asks it. */
  title: string;
  pattern: RegExp;
  isCountrySpecific: boolean;
}

export const DECLARATION_TOPICS: DeclarationTopic[] = [
  {
    topic: 'conflict-of-interest',
    title: 'Would you have a conflict of interest (outside work, financial interest)?',
    pattern: /\b(outside employment|significant financial interest|pose a conflict|conflicts? of interest policy)\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'sanctioned-country-ties',
    title: 'Citizen, passport or residency of a sanctioned country (Iran, Cuba, Russia…)?',
    pattern: /\b(citizen|passport|refugee|asylum)\b[\s\S]*\b(iran|cuba|north korea|syria|russia|belarus)\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'relative-at-company',
    title: 'Family or close relation working at the company or as a government official?',
    pattern: /\b(family member|relative|close personal relationship)\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'government-employment',
    title: 'Worked for the US government or a public institution?',
    pattern: /\b(government or public institution employment|government employment|federal, state,? or local)\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'government-official-role',
    title: 'Served in a government body that regulates or buys from the company?',
    pattern: /\b(served|serving|government official)\b[\s\S]*\b(government|public body)\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'restrictive-agreement',
    title: 'Bound by a non-compete, non-solicit or NDA?',
    pattern: /\b(non-?compet\w*|non-?solicit\w*|non-?disclosure|restrictive covenant)\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'sponsorship',
    title: 'Need visa sponsorship?',
    pattern: /\b(sponsor(ship)?|visa (support|transfer)|h-?1b)\b/i,
    isCountrySpecific: true,
  },
  {
    topic: 'work-permit',
    title: 'Have a valid work permit / authorised to work?',
    pattern:
      /\b(work permit|authori[sz]ed to work|right to work|legally (able|eligible|permitted) to work|eligib\w* to work)\b/i,
    isCountrySpecific: true,
  },
  {
    topic: 'residency-permit',
    title: 'Have a valid residency permit?',
    pattern: /\b(residen(cy|ce) permit|permanent residen\w*)\b/i,
    isCountrySpecific: true,
  },
  {
    topic: 'relocation',
    title: 'Willing to relocate?',
    pattern: /\b(relocat\w*|willing to move)\b/i,
    isCountrySpecific: true,
  },
  {
    topic: 'previously-employed-here',
    title: 'Previously worked for the company you apply to?',
    pattern: /\b(previously|ever|formerly) (been )?(employed|worked) (by|for|at)\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'drivers-license',
    title: "Have a valid driver's licence?",
    pattern: /\bdriver'?s? licen[cs]e\b/i,
    isCountrySpecific: true,
  },
  {
    topic: 'minimum-age',
    title: 'At least 18 years old?',
    pattern: /\b(at least|over|older than) (18|eighteen)\b|\b18 years\b/i,
    isCountrySpecific: false,
  },
  {
    topic: 'background-check',
    title: 'Willing to take a background check or drug test?',
    pattern: /\b(background check|drug (test|screen))\b/i,
    isCountrySpecific: false,
  },
];

/** Topics are checked most specific first: long legal questions often mention other topics in passing. */
export function findDeclarationTopic(questionLabel: string): DeclarationTopic | undefined {
  return DECLARATION_TOPICS.find((declaration) => declaration.pattern.test(questionLabel));
}

/** Keys to look an answer up by: this country's answer first, then the one for every country. */
export function candidateAnswerKeys(questionLabel: string, jobCountry?: string): string[] {
  const exactKey = rememberedAnswerKey(questionLabel, jobCountry);
  const everyCountryKey = rememberedAnswerKey(questionLabel);
  return exactKey === everyCountryKey ? [exactKey] : [exactKey, everyCountryKey];
}

/**
 * The key a remembered answer is stored under. Declarations share one key per topic (per country
 * when it matters); any other question is matched by its wording.
 */
export function rememberedAnswerKey(questionLabel: string, jobCountry?: string): string {
  const declaration = findDeclarationTopic(questionLabel);
  if (!declaration) return `question:${labelKey(questionLabel)}`;
  const countrySuffix = declaration.isCountrySpecific ? `@${(jobCountry ?? 'any').toLowerCase()}` : '';
  return `topic:${declaration.topic}${countrySuffix}`;
}
