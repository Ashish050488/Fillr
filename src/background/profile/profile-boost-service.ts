import { isKeywordInText, marketKeywords, targetRoles } from '../../shared/jobs/market-keywords';
import { profilePageKey } from '../../shared/jobs/profile-pages';
import { getStorage, setStorage } from '../../shared/storage/extension-storage';
import type {
  AnswerQuestionsResult,
  FormQuestion,
  Job,
  ProfileBoost,
  ProfilePageField,
  ProfilePageScan,
} from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { loadWriterInput } from '../jobs/candidate-profile';
import { readJobs } from '../jobs/job-store';

const PROFILE_BOOST_STORAGE_KEY = 'jobfill_profile_boost_v1';
const MAXIMUM_TEXT_FIELDS = 12;
const MAXIMUM_CURRENT_TEXT_IN_QUESTION = 700;
const MAXIMUM_PAGE_TEXT = 6000;
const MAXIMUM_SKILLS_TO_ADD = 10;

const splitLines = (text = '') =>
  text
    .split('\n')
    .map((line) => line.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').trim())
    .filter(Boolean);
const sameText = (first: string, second: string) =>
  first.replace(/\s+/g, ' ').trim().toLowerCase() === second.replace(/\s+/g, ' ').trim().toLowerCase();

/** One profile box as a question for the writer: where it sits, what it says now and its limit. */
export function describeProfileField(field: ProfilePageField): string {
  const place = [field.section, field.label].filter(Boolean).join(': ');
  const current = field.value.trim()
    ? `Current text: ${JSON.stringify(field.value.trim().slice(0, MAXIMUM_CURRENT_TEXT_IN_QUESTION))}.`
    : 'Currently empty.';
  return [
    `${place}${field.context ? ` (for ${field.context})` : ''}.`,
    current,
    field.maxLength ? `Limit: ${field.maxLength} characters.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** What the writer needs to know about the market: the roles you want and what recruiters search for. */
export function buildProfileBrief(scan: ProfilePageScan, jobs: Job[]): string {
  const keywords = marketKeywords(jobs);
  const roles = targetRoles(jobs);
  const missingKeywords = keywords.filter((keyword) => !isKeywordInText(keyword, scan.pageText));
  return [
    `Profile site: ${scan.site}. Page: ${new URL(scan.url).pathname}.`,
    `Target roles: ${roles.join(', ') || 'use the roles on the page and in the candidate profile'}.`,
    keywords.length
      ? `Target keywords (most asked for in the postings the candidate checked): ${keywords.join(', ')}.`
      : "Target keywords: the candidate's strongest skills from the profile.",
    missingKeywords.length ? `Not yet on the page: ${missingKeywords.join(', ')}.` : '',
    `Profile page text as it is now:\n${scan.pageText.slice(0, MAXIMUM_PAGE_TEXT)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** The writer's answers as suggestions, dropping unchanged boxes and skills already listed. */
export function toProfileBoost(
  answers: Record<string, string>,
  scan: ProfilePageScan,
  textFields: ProfilePageField[],
  createdAt = Date.now(),
): ProfileBoost {
  const suggestions = textFields
    .map((field) => ({
      fieldId: field.id,
      label: field.section || field.label,
      current: field.value,
      suggested: (answers[field.id] ?? '').trim(),
      maxLength: field.maxLength,
    }))
    .filter((suggestion) => suggestion.suggested && !sameText(suggestion.suggested, suggestion.current));
  const skillsToAdd = [
    ...new Set(
      (answers.skillsToAdd ?? '')
        .split(/[,\n]/)
        .map((skill) => skill.trim())
        .filter((skill) => skill && skill.length <= 40 && !isKeywordInText(skill, scan.pageText)),
    ),
  ].slice(0, MAXIMUM_SKILLS_TO_ADD);
  return {
    site: scan.site,
    page: new URL(scan.url).pathname,
    suggestions,
    skillsToAdd,
    tips: splitLines(answers.tips).slice(0, 3),
    createdAt,
  };
}

async function readSavedBoosts(): Promise<Record<string, ProfileBoost>> {
  return getStorage<Record<string, ProfileBoost>>(PROFILE_BOOST_STORAGE_KEY, {});
}

/** The rewrite saved for this page, so reopening the panel costs no AI call. */
export async function savedProfileBoost(scan: ProfilePageScan): Promise<ProfileBoost | undefined> {
  return (await readSavedBoosts())[profilePageKey(scan.url)];
}

/** Rewrites every box on the page for search, from your profile and the postings you checked. */
export async function boostProfile(scan: ProfilePageScan): Promise<ProfileBoost> {
  const textFields = scan.fields.filter((field) => field.kind === 'text').slice(0, MAXIMUM_TEXT_FIELDS);
  if (!textFields.length && !scan.fields.length) {
    throw new Error('No profile boxes found here. Open a section of Edit profile (for example Profile) and try again.');
  }
  const [writerInput, jobs] = await Promise.all([loadWriterInput({ includePublicLinks: true }), readJobs()]);
  const questions: FormQuestion[] = [
    ...textFields.map((field) => ({ id: field.id, label: describeProfileField(field), kind: 'long' as const })),
    { id: 'skillsToAdd', label: 'Skills to add, comma separated', kind: 'short', maxLength: 400 },
    { id: 'tips', label: 'Three changes outside these boxes, one per line', kind: 'long' },
  ];
  const { result } = await runTask('answer_questions', {
    ...writerInput,
    jobTitle: targetRoles(jobs).join(', '),
    company: scan.site,
    jobDescription: buildProfileBrief(scan, jobs),
    questions,
    audience: 'profile-boost',
  });
  const boost = toProfileBoost((result as AnswerQuestionsResult).answers, scan, textFields);
  if (!boost.suggestions.length && !boost.skillsToAdd.length && !boost.tips.length) {
    throw new Error('No suggestions came back. Try again in a moment.');
  }
  await setStorage({
    [PROFILE_BOOST_STORAGE_KEY]: { ...(await readSavedBoosts()), [profilePageKey(scan.url)]: boost },
  });
  return boost;
}
