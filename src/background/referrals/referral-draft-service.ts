import { linkedInProfileId } from '../../shared/jobs/linkedin-profile-id';
import { getStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import type {
  AnswerQuestionsResult,
  FormQuestion,
  LinkedInProfileSnapshot,
  OutreachGoal,
  Profile,
  Referral,
  ReferralDrafts,
} from '../../shared/types';
import { runTask } from '../ai/ai-engine';
import { RECIPIENT_PERSONAS } from '../ai/tasks/referral-message-rules';
import { loadWriterInput } from '../jobs/candidate-profile';
import { formatJobPosting } from '../jobs/format-job-posting';
import { getJob } from '../jobs/job-store';
import { checkBeforeDrafting, sameCompanyNotice } from './referral-checks';
import { readReferrals, saveReferralDraft } from './referral-store';

const MAXIMUM_PROFILE_TEXT_LENGTH = 9000;
const MAXIMUM_POSTS_TEXT_LENGTH = 5000;
const MAXIMUM_JOB_TEXT_LENGTH = 2500;
const INVITATION_NOTE_LIMIT = 200;

const GOAL_DESCRIPTIONS: Record<OutreachGoal, string> = {
  auto: 'Choose from who they are (see the persona rules).',
  referral: 'A referral for the job below (or a role like it at their company).',
  job: 'A role at their company: ask about joining, not for a referral.',
  advice: '15 minutes of their advice, no job ask.',
  followup: 'A follow-up: they have not replied to your earlier message (below).',
};

const REFERRAL_QUESTIONS: FormQuestion[] = [
  { id: 'persona', label: 'Who they are to you', kind: 'choice', options: [...RECIPIENT_PERSONAS] },
  { id: 'angle', label: 'Their work and your matching work, one line', kind: 'short', maxLength: 160 },
  { id: 'message', label: 'LinkedIn message asking for a referral', kind: 'long' },
  { id: 'invitation', label: 'Connection request note (190 characters at most)', kind: 'short' },
  { id: 'subject', label: 'Email subject', kind: 'short', maxLength: 80 },
  { id: 'email', label: 'Email asking for a referral', kind: 'long' },
  { id: 'company', label: 'Their current company', kind: 'short', maxLength: 120 },
  { id: 'personRole', label: 'Their current job title', kind: 'short', maxLength: 160 },
];

/** Your resume link (a Google Drive share link, for example) and your own LinkedIn profile id. */
async function loadOwnLinks(): Promise<{ resumeLink: string; ownProfileId?: string }> {
  const profiles = await getStorage<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const fields = profiles[0]?.fields ?? {};
  const ownLinkedIn = fields.linkedin?.value?.trim() ?? '';
  return {
    resumeLink: fields.resumeLink?.value?.trim() ?? '',
    ownProfileId: ownLinkedIn
      ? linkedInProfileId(/^https?:/.test(ownLinkedIn) ? ownLinkedIn : `https://${ownLinkedIn}`)
      : undefined,
  };
}

/** A connection note must fit LinkedIn's 200 characters: cut at the last full sentence or word. */
export function fitInvitationNote(note: string): string {
  const singleLine = note.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= INVITATION_NOTE_LIMIT) return singleLine;
  const shortened = singleLine.slice(0, INVITATION_NOTE_LIMIT);
  const lastSentenceEnd = Math.max(shortened.lastIndexOf('. '), shortened.lastIndexOf('? '));
  if (lastSentenceEnd > INVITATION_NOTE_LIMIT / 2) return shortened.slice(0, lastSentenceEnd + 1);
  return `${shortened.slice(0, shortened.lastIndexOf(' ')).replace(/[,;:]$/, '')}.`;
}

/** Links go in by code, exactly as saved, never retyped by the AI. */
export function appendLinks(text: string, links: { jobUrl?: string; resumeLink?: string }): string {
  const linkLines = [
    links.jobUrl ? `Job: ${links.jobUrl}` : '',
    links.resumeLink ? `My resume: ${links.resumeLink}` : '',
  ].filter(Boolean);
  if (!linkLines.length) return text;
  // The sign-off stays last: links go just before it.
  const paragraphs = text.trim().split(/\n{2,}/);
  const signOff = paragraphs.length > 1 && paragraphs[paragraphs.length - 1].length < 60 ? paragraphs.pop() : undefined;
  return [...paragraphs, linkLines.join('\n'), ...(signOff ? [signOff] : [])].join('\n\n');
}

async function describeJob(jobUrl?: string): Promise<{ jobText: string; jobTitle?: string; company?: string }> {
  if (!jobUrl) return { jobText: 'None given.' };
  const job = await getJob(jobUrl).catch(() => undefined);
  const postingText = job?.jobFacts ? formatJobPosting(job.jobFacts).slice(0, MAXIMUM_JOB_TEXT_LENGTH) : '';
  return {
    jobText: [job?.jobTitle, job?.company, jobUrl, postingText].filter(Boolean).join('\n'),
    jobTitle: job?.jobTitle,
    company: job?.company,
  };
}

/** Reads the profile you have open and writes a referral message, connection note and email. Never sends. */
export async function draftReferral(
  snapshot: LinkedInProfileSnapshot,
  jobUrl?: string,
  goal: OutreachGoal = 'auto',
): Promise<{ drafts: ReferralDrafts; referral: Referral; notices: string[] }> {
  const profileId = linkedInProfileId(snapshot.profileUrl);
  if (!profileId) throw new Error('Open someone’s LinkedIn profile first.');
  const [writerInput, { resumeLink, ownProfileId }, job, referrals] = await Promise.all([
    loadWriterInput(),
    loadOwnLinks(),
    describeJob(jobUrl),
    readReferrals(),
  ]);
  const { notices, earlierMessage } = checkBeforeDrafting({
    profileId,
    ownProfileId,
    profileText: snapshot.profileText,
    goal,
    referrals,
  });
  const personDescription = [
    `Their LinkedIn profile (${snapshot.personName}):\n${snapshot.profileText.slice(0, MAXIMUM_PROFILE_TEXT_LENGTH)}`,
    snapshot.postsText ? `Their recent posts:\n${snapshot.postsText.slice(0, MAXIMUM_POSTS_TEXT_LENGTH)}` : '',
    `Job you are asking about:\n${job.jobText}`,
    `What you want: ${GOAL_DESCRIPTIONS[goal]}`,
    earlierMessage ? `Your earlier message (sent ${earlierMessage.daysAgo} days ago):\n${earlierMessage.text}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  const { result } = await runTask('answer_questions', {
    ...writerInput,
    jobTitle: job.jobTitle,
    company: job.company,
    jobDescription: personDescription,
    questions: REFERRAL_QUESTIONS,
    audience: 'linkedin-referral',
  });
  const answers = (result as AnswerQuestionsResult).answers;
  if (!answers.message) throw new Error('The AI left the message blank. Try again in a moment.');
  // A follow-up does not repeat the links they already have.
  const isFollowUp = goal === 'followup';
  const links = isFollowUp ? {} : { jobUrl, resumeLink };
  const drafts: ReferralDrafts = {
    message: appendLinks(answers.message, links),
    invitationNote: fitInvitationNote(answers.invitation ?? ''),
    emailSubject: answers.subject ?? '',
    emailBody: appendLinks(answers.email ?? answers.message, links),
    persona: answers.persona || undefined,
    angle: answers.angle || undefined,
  };
  const referral = await saveReferralDraft({
    id: profileId,
    profileUrl: `https://www.${profileId}/`,
    personName: snapshot.personName,
    personRole: answers.personRole || undefined,
    company: answers.company || job.company || undefined,
    jobUrl,
    persona: drafts.persona,
    // Keep the first message: the next follow-up builds on it.
    ...(isFollowUp ? {} : { message: drafts.message }),
  });
  const companyNotice = sameCompanyNotice(referrals, profileId, referral.company);
  return { drafts, referral, notices: companyNotice ? [...notices, companyNotice] : notices };
}
