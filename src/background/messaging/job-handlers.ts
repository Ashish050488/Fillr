import { jobPrepareSchema } from '../../shared/schemas';
import { deleteJob, getJob, getJobByKey, updateJob } from '../jobs/job-store';
import { jobsMissingTitles, markApplied, recordFill, setStatus } from '../jobs/job-tracking';
import { ensureJobMeta, prepareJob, rewriteCoverLetter } from '../jobs/prepare-job-service';
import { describeError, isExtensionPage, type RegisterMessageHandler } from './message-registrar';

const MAXIMUM_COVER_LETTER_LENGTH = 12000;
const MAXIMUM_NOTES_LENGTH = 5000;

/** Live progress for both the in-page widget and the side panel; nobody listening is fine. */
function broadcastProgress(text: string, url: string, tabId?: number): void {
  const progressMessage = { action: 'FILL_PROGRESS', payload: { text, url } };
  chrome.runtime.sendMessage(progressMessage).catch(() => undefined);
  if (tabId != null) chrome.tabs.sendMessage(tabId, progressMessage).catch(() => undefined);
}

/** Fit checks, filling, tracker records and cover letters. */
export function registerJobHandlers(handle: RegisterMessageHandler): void {
  handle('RECORD_FORM_FILL', async (payload, sender) => {
    const url = sender.tab?.url ?? payload.url;
    await ensureJobMeta(url, payload).catch(() => undefined);
    return recordFill({ ...payload, url });
  });

  handle('MARK_JOB_APPLIED', async (payload, sender) => {
    // The thank-you page has its own URL; the content script reports the application page instead.
    const url = (payload.frame ? sender.tab?.url : payload.url) || sender.tab?.url || '';
    await ensureJobMeta(url, payload).catch(() => undefined);
    return markApplied(url, payload.auto);
  });

  handle('JOB_REPAIR', async () => {
    let repairedCount = 0;
    for (const job of await jobsMissingTitles()) {
      const repairedJob = await ensureJobMeta(job.url).catch(() => undefined);
      if (repairedJob?.jobTitle && !job.jobTitle) repairedCount += 1;
    }
    return { success: true, fixed: repairedCount };
  });

  handle('JOB_GET', async ({ url }) => ({ success: true, job: await getJob(url) }));

  handle('JOB_PREPARE', async (payload, sender) => {
    const parsedRequest = jobPrepareSchema.safeParse(payload);
    if (!parsedRequest.success)
      return { success: false, error: 'This page could not be read. Refresh it and try again.' };
    const reportStage = (text: string) => broadcastProgress(text, parsedRequest.data.scan.url, sender.tab?.id);
    try {
      return { success: true, ...(await prepareJob({ ...parsedRequest.data, onStage: reportStage })) };
    } catch (error) {
      return { success: false, error: describeError(error, undefined, 'AI could not prepare this application.') };
    }
  });

  handle('JOB_COVER_LETTER', async ({ key, style }, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Only the JobFill panel can rewrite letters.' };
    try {
      return { success: true, job: await rewriteCoverLetter(key, style) };
    } catch (error) {
      return { success: false, error: describeError(error, undefined, 'Could not rewrite the letter.') };
    }
  });

  handle('JOB_UPDATE', async ({ key, patch }, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Only the JobFill panel can edit jobs.' };
    const job = await getJobByKey(key);
    if (!job) return { success: false, error: 'That job no longer exists.' };
    const allowedChanges = {
      ...(typeof patch.coverLetter === 'string'
        ? { coverLetter: patch.coverLetter.slice(0, MAXIMUM_COVER_LETTER_LENGTH) }
        : {}),
      ...(typeof patch.notes === 'string' ? { notes: patch.notes.slice(0, MAXIMUM_NOTES_LENGTH) } : {}),
    };
    let updatedJob = Object.keys(allowedChanges).length
      ? await updateJob(job.url, (current) => ({ ...current, ...allowedChanges }))
      : job;
    if (patch.status && patch.status !== job.status) updatedJob = await setStatus(job.url, patch.status);
    return { success: true, job: updatedJob };
  });

  handle('JOB_DELETE', async ({ key }, sender) => {
    if (!isExtensionPage(sender)) return { success: false, error: 'Only the JobFill panel can delete jobs.' };
    const isDeleted = await deleteJob(key);
    return isDeleted ? { success: true } : { success: false, error: 'That job was already deleted.' };
  });
}
