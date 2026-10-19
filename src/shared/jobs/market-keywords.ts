import type { Job } from '../types';

/**
 * What recruiters for your kind of job search for, learned from the postings you checked:
 * the skills they ask for and the titles they hire under. No AI; it only counts.
 */

const DEFAULT_KEYWORD_COUNT = 15;
const DEFAULT_ROLE_COUNT = 4;

/** "React.js", "react" and "ReactJS" are the same search term; "CI/CD" matches "ci cd". */
export function keywordKey(keyword: string): string {
  return ` ${keyword
    .toLowerCase()
    .replace(/\.?js\b/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ')} `.replace(/\s+/g, ' ');
}

/** True when the keyword already appears as whole words somewhere in the text. */
export function isKeywordInText(keyword: string, text: string): boolean {
  const key = keywordKey(keyword);
  return key.trim().length > 0 && keywordKey(text).includes(key);
}

/** Counts each term once per job, keeping the spelling seen most often. */
function rankTerms(termLists: string[][], limit: number): string[] {
  const tally = new Map<string, { count: number; spellings: Map<string, number> }>();
  for (const terms of termLists) {
    const seenInThisJob = new Set<string>();
    for (const rawTerm of terms) {
      const term = rawTerm.trim();
      const key = keywordKey(term).trim();
      if (!key || term.length > 40 || seenInThisJob.has(key)) continue;
      seenInThisJob.add(key);
      const entry = tally.get(key) ?? { count: 0, spellings: new Map<string, number>() };
      entry.count += 1;
      entry.spellings.set(term, (entry.spellings.get(term) ?? 0) + 1);
      tally.set(key, entry);
    }
  }
  return [...tally.values()]
    .sort((first, second) => second.count - first.count)
    .slice(0, limit)
    .map((entry) => [...entry.spellings.entries()].sort((first, second) => second[1] - first[1])[0][0]);
}

/** The skills that come up most across the postings you checked, most common first. */
export function marketKeywords(jobs: Job[], limit = DEFAULT_KEYWORD_COUNT): string[] {
  return rankTerms(
    jobs.map((job) => [...(job.jobFacts?.skills ?? []), ...(job.analysis?.keywords ?? [])]),
    limit,
  );
}

/** The job titles you look at most, without level words, e.g. "Backend Engineer". */
export function targetRoles(jobs: Job[], limit = DEFAULT_ROLE_COUNT): string[] {
  return rankTerms(
    jobs.map((job) => [
      (job.jobFacts?.title ?? job.jobTitle ?? '')
        .replace(/\(.*?\)|[,|].*$/g, '')
        .replace(/\b(senior|sr|junior|jr|lead|staff|principal|intern|i{1,3}|[1-3])\b\.?/gi, '')
        .replace(/\s+/g, ' ')
        .trim(),
    ]),
    limit,
  );
}
