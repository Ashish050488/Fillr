import React from 'react';
import { isKeywordInText, marketKeywords } from '../../../shared/jobs/market-keywords';
import type { Job } from '../../../shared/types';

/**
 * Which of the skills recruiters ask for (counted from the postings you checked) your profile
 * page already says, as one row of chips. No AI: it updates as soon as the page changes.
 */
export default function KeywordCoverage({ jobs, pageText }: { jobs: Job[]; pageText: string }) {
  const keywords = marketKeywords(jobs);
  if (!keywords.length) {
    return (
      <p className="muted small">
        Check your fit on a few job postings first: JobFill learns which skills recruiters search for from them.
      </p>
    );
  }
  const covered = keywords.filter((keyword) => isKeywordInText(keyword, pageText));
  const missing = keywords.filter((keyword) => !covered.includes(keyword));
  return (
    <section className="stack-sm" aria-label="Search keywords">
      <div className="row between">
        <span className="section-title">Recruiters search for</span>
        <span className="tiny">
          {covered.length}/{keywords.length} on this page
        </span>
      </div>
      <div className="chips">
        {missing.map((keyword) => (
          <span key={keyword} className="chip signal warning" title="Not on this page yet">
            <span aria-hidden="true">!</span> {keyword}
          </span>
        ))}
        {covered.map((keyword) => (
          <span key={keyword} className="chip signal good" title="Already on this page">
            <span aria-hidden="true">✓</span> {keyword}
          </span>
        ))}
      </div>
    </section>
  );
}
