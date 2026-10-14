import type { JobFacts } from '../../shared/types';

const MAXIMUM_ATS_POSTING_LENGTH = 9000;
const MAXIMUM_RAW_PAGE_LENGTH = 12000;
const MAXIMUM_POSTING_LENGTH = 30000;

function formatHeader(jobFacts: JobFacts): string {
  return [jobFacts.title, jobFacts.company, jobFacts.location, jobFacts.employmentType, jobFacts.seniority]
    .filter(Boolean)
    .join(' | ');
}

function formatSection(title: string, entries?: string[]): string {
  return entries?.length ? `${title}:\n${entries.map((entry) => `* ${entry}`).join('\n')}` : '';
}

/** Compact, readable posting text for the writing model. */
export function formatJobPosting(jobFacts: JobFacts): string {
  const header = formatHeader(jobFacts);
  // Straight from the ATS API: already clean, no AI rewrite needed.
  if (jobFacts.description) return `${header}\n\n${jobFacts.description}`.slice(0, MAXIMUM_ATS_POSTING_LENGTH);
  return [
    header,
    jobFacts.summary ?? '',
    formatSection('Responsibilities', jobFacts.responsibilities),
    formatSection('Requirements', jobFacts.requirements),
    formatSection('Nice to have', jobFacts.niceToHave),
    formatSection('Key skills', jobFacts.skills),
    formatSection('Company values', jobFacts.values),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** The cleaned posting when there is one, otherwise the (noisier) page text. */
export function buildPostingText(jobFacts: JobFacts | undefined, pageText: string): string {
  const hasUsableFacts = Boolean(
    jobFacts &&
      (jobFacts.description || jobFacts.responsibilities?.length || jobFacts.requirements?.length || jobFacts.summary),
  );
  const postingText = hasUsableFacts ? formatJobPosting(jobFacts!) : pageText.slice(0, MAXIMUM_RAW_PAGE_LENGTH);
  return postingText.slice(0, MAXIMUM_POSTING_LENGTH);
}
