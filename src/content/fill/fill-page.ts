import { withTimeout } from '../../shared/async/with-timeout';
import { sendMessage } from '../../shared/messaging/extension-messages';
import { findChoiceButtonGroups } from '../form/choice-button-groups';
import { collectFillables } from '../form/collect-fillable-fields';
import { fieldSignals } from '../form/match-profile-field';
import { questionLabel, readJobContext } from '../page/collect-questions';
import { declineDemographicQuestions } from './decline-demographic-questions';
import { hasDialCodeField } from './field-shape';
import { fillAiAnswers } from './fill-ai-answers';
import { fillSavedDetails } from './fill-saved-details';
import { FillSession } from './fill-session';
import type { FillOptions, FillResult, JobContext } from './fill-types';
import { loadFillProfile } from './load-fill-profile';
import { reapplyRevertedValues } from './reapply-reverted-values';
import { buildFillReport, type FillReportRow } from './fill-report';
import { isWorkday } from '../workday/workday-page';
import { fillWorkdaySelfIdentify } from '../workday/workday-self-identify';
import { readPostingUrl } from '../page/posting-url';

export type { FillOptions, FillResult, JobContext } from './fill-types';

const PROFILE_TIMEOUT_MILLISECONDS = 15_000;
const MAXIMUM_SKIPPED_LABELS = 30;

/** Embedded application iframes (e.g. Greenhouse on a careers page) fill themselves via the background. */
async function fillEmbeddedForms(context: JobContext, force?: boolean) {
  if (window.top !== window || !document.querySelector('iframe')) return { filled: 0, ai: 0, total: 0, held: false };
  try {
    const frameReply = await sendMessage('FILL_FRAMES', {
      context: { url: context.url, pageText: '', jobTitle: context.jobTitle, company: context.company },
      force,
    });
    return {
      filled: frameReply.filled ?? 0,
      ai: frameReply.ai ?? 0,
      total: frameReply.total ?? 0,
      held: Boolean(frameReply.held),
    };
  } catch {
    return { filled: 0, ai: 0, total: 0, held: false };
  }
}

/** "12 of 14 done, 3 written for this job. 2 need you." Counts what is on the page, not just this run. */
function describeReport(report: FillReportRow[], aiCount: number): string {
  const needCount = report.filter((row) => row.status === 'needs-you').length;
  const aiNote = aiCount ? `, ${aiCount} written for this job` : '';
  const next = needCount ? `${needCount} need${needCount === 1 ? 's' : ''} you.` : 'Review, then submit.';
  return `${report.length - needCount} of ${report.length} done${aiNote}. ${next}`;
}

/**
 * Fill this application: saved details (instant), then AI answers for real questions, then
 * "decline" for demographic questions, then any embedded forms. Never submits.
 */
export async function fillPage(options: FillOptions = {}): Promise<FillResult> {
  const reportProgress = options.onProgress ?? (() => undefined);
  const reportStage = options.onStage ?? (() => undefined);
  reportStage('reading');
  reportProgress('Reading this form…');
  const fields = collectFillables();
  // Button-row questions (Ashby Yes/No) are not inputs, but each one is a field to fill.
  const choiceGroupCount = findChoiceButtonGroups().length;
  let profile: Awaited<ReturnType<typeof loadFillProfile>>;
  try {
    const timeoutMessage = 'JobFill did not answer. Reload the extension or refresh this page, then try again.';
    profile = await withTimeout(loadFillProfile(), PROFILE_TIMEOUT_MILLISECONDS, timeoutMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile unavailable';
    return { success: false, filledCount: 0, skippedCount: fields.length, totalCount: fields.length, message };
  }

  const session = new FillSession();
  reportStage('details');
  reportProgress('Filling your saved details…');
  const isDialCodeSeparate = hasDialCodeField(fields);
  await fillSavedDetails(profile, fields, session, {
    isAutomatic: options.auto,
    hasDialCodeField: isDialCodeSeparate,
    reportProgress,
  });
  await reapplyRevertedValues(session);
  const savedDetailCount = session.filledFields.size;
  const savedDetailFields = new Set(session.filledFields);
  reportStage('answers');

  const context = options.context ?? readJobContext();
  const aiOutcome = await fillAiAnswers(fields, context, session, {
    force: options.force,
    isAutomatic: options.auto,
    reportProgress,
    applicantName: profile.values.name,
  });
  await declineDemographicQuestions(fields, session, isDialCodeSeparate);
  if (isWorkday()) fillWorkdaySelfIdentify(profile.values.name, session);
  const embedded = await fillEmbeddedForms(context, options.force);
  reportStage('checking');
  const report = buildFillReport(fields, session, savedDetailFields, findChoiceButtonGroups());

  const filledCount = session.filledFields.size + embedded.filled;
  const totalCount = fields.length + choiceGroupCount + embedded.total;
  const aiCount = session.filledFields.size - savedDetailCount + embedded.ai;
  const isHeldBack = aiOutcome.held || embedded.held;
  const scoreNote = aiOutcome.score !== undefined ? ` (${aiOutcome.score}%)` : '';
  const message = isHeldBack
    ? `Filled ${filledCount} saved details. This role looks like a weak fit${scoreNote}, so its questions were left for you.`
    : describeReport(report, aiCount);
  const skipped = fields
    .filter((field) => !session.isFilled(field))
    .map((field) => questionLabel(field) || fieldSignals(field)[0] || 'Unrecognised field')
    .slice(0, MAXIMUM_SKIPPED_LABELS);

  if (filledCount > 0 && window.top === window) {
    await sendMessage('RECORD_FORM_FILL', {
      site: location.hostname,
      url: readPostingUrl(),
      fieldsFilled: filledCount,
      jobTitle: context.jobTitle ?? document.title,
      company: context.company,
      atsUrl: context.atsUrl,
    }).catch(() => undefined); // Tracking must never undo a fill.
  }
  return {
    success: true,
    filledCount,
    aiCount,
    skipped,
    skippedCount: totalCount - filledCount,
    totalCount,
    message,
    aiError: aiOutcome.aiError,
    held: isHeldBack,
    score: aiOutcome.score,
  };
}
