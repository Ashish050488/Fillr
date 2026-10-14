import { normalizeWhitespace } from './question-label';

interface JobPosting {
  description?: string;
  title?: string;
  hiringOrganization?: { name?: string } | string;
}

function readStructuredPosting(): JobPosting | undefined {
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const structuredData: unknown = JSON.parse(script.textContent ?? '');
      const graphNodes = (
        Array.isArray(structuredData)
          ? structuredData
          : [structuredData, ...((structuredData as { '@graph'?: unknown[] })?.['@graph'] ?? [])]
      ) as Array<Record<string, unknown>>;
      const posting = graphNodes.find((graphNode) => graphNode?.['@type'] === 'JobPosting');
      if (posting) return posting as JobPosting;
    } catch {
      /* Ignore malformed structured data. */
    }
  }
  return undefined;
}

const DESCRIPTION_SELECTORS = [
  '[data-automation-id="jobPostingDescription"]',
  '#job-description',
  '.job-description',
  '[class*="jobDescription"]',
  '[class*="job-description"]',
  '[data-qa="job-description"]',
  '.posting-page .section-wrapper',
  '#content .job__description',
  '.jobs-description__content',
  '.jobsearch-JobComponent-description',
  '[class*="description"]',
  'article',
  'main',
];

function htmlToPlainText(html: string): string {
  const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
  return normalizeWhitespace(parsedDocument.body.textContent);
}

const ATS_FRAME =
  /(greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|recruitee\.com|workable\.com)/i;

/** The job posting page as raw text, plus title and company hints. The background cleans it up. */
export function readJobContext(): {
  pageText: string;
  url: string;
  jobTitle?: string;
  company?: string;
  atsUrl?: string;
} {
  const posting = readStructuredPosting();
  const hiringOrganization = posting?.hiringOrganization;
  const company =
    normalizeWhitespace(typeof hiringOrganization === 'string' ? hiringOrganization : hiringOrganization?.name) ||
    normalizeWhitespace(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content'));
  const jobTitle =
    normalizeWhitespace(posting?.title) ||
    normalizeWhitespace(document.querySelector('h1')?.textContent) ||
    normalizeWhitespace(document.title);
  let pageText = posting?.description ? htmlToPlainText(posting.description) : '';
  if (pageText.length < 400) {
    for (const selector of DESCRIPTION_SELECTORS) {
      const descriptionCandidates = Array.from(document.querySelectorAll<HTMLElement>(selector))
        .filter((candidate) => !candidate.closest('#jobfill-panel-host'))
        .map((candidate) => candidate.innerText.trim())
        .filter((candidateText) => candidateText.length > 400);
      const longestDescription = descriptionCandidates.sort((first, second) => second.length - first.length)[0];
      if (longestDescription) {
        pageText = longestDescription;
        break;
      }
    }
  }
  // Keep line breaks: they help Gemma separate sections of a noisy page.
  if (pageText.length < 400) pageText = document.body.innerText.trim();
  // A careers page embedding Greenhouse/Lever: the iframe URL identifies the posting for the ATS API.
  const atsUrl = Array.from(document.querySelectorAll('iframe'))
    .map((frame) => frame.src)
    .find((frameSource) => ATS_FRAME.test(frameSource));
  return {
    pageText: pageText.replace(/\n{3,}/g, '\n\n').slice(0, 60000),
    url: location.href,
    jobTitle: jobTitle.slice(0, 300) || undefined,
    company: company.slice(0, 300) || undefined,
    ...(atsUrl ? { atsUrl: atsUrl.slice(0, 2000) } : {}),
  };
}
