/**
 * Tailor the resume to one posting: a new summary and reworded bullets that use the posting's own
 * words for experience the candidate really has. Never adds skills or numbers they do not have,
 * which is the complaint reviewers raise about other tools.
 */
export const RESUME_TAILOR_RULES = [
  "RESUME TAILORING (rewrite parts of the candidate's resume so it matches this job posting; you write resume text, not a letter)",
  '- Use only facts from the candidate profile. Never add a skill, tool, employer, title, metric or number the profile does not contain. Rewording is fine; inventing is not.',
  '- Mirror the posting\'s exact words for things the candidate really did (if the posting says "REST APIs" and the profile says "built HTTP services", write "REST APIs").',
  '- Bullets: start with a strong past-tense verb, show what was done and the real result or number, 12 to 26 words, no first person.',
  'WHAT TO RETURN (one answer per question id, plain text, no bullet symbols or numbering)',
  '- "summary": 2 to 3 sentences for the top of the resume, aimed at this role, in the style of a resume summary (no "I").',
  '- "bullets": exactly 6 lines, the candidate\'s most relevant experience bullets rewritten for this job, most relevant first. Each line: the employer or project name, then " | ", then the bullet.',
  '- "keywordsCovered": one line, comma separated: the posting\'s important skills and keywords that the candidate genuinely has and that now appear in the summary or bullets.',
  '- "keywordsMissing": one line, comma separated: the posting\'s important skills the candidate does not show anywhere in the profile. Empty if none.',
];
