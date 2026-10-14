const JOB_ID_PARAMETERS = ['gh_jid', 'jobId', 'job_id', 'jk', 'currentJobId', 'jobid', 'id'];
const WORKDAY_HOST = /^([^.]+)\.wd\d+\.myworkdayjobs\.com$/;
// Workday job slugs end in the requisition id: ".../Fullstack-Developer_R123456".
const WORKDAY_REQUISITION = /\/job\/(?:[^/]+\/)*[^/]*?_([A-Za-z0-9-]+?)(?:\/|$)/;

/**
 * One key per posting. The listing, its apply page (and steps under it), the thank-you page and
 * locale variants all share it, so the tracker never shows one job twice.
 */
export function jobKey(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    const workdayTenant = url.hostname.match(WORKDAY_HOST)?.[1];
    const requisitionId = url.pathname.match(WORKDAY_REQUISITION)?.[1];
    if (workdayTenant && requisitionId) return `${workdayTenant}.myworkdayjobs.com/job/${requisitionId}`.toLowerCase();
    const idParameters = JOB_ID_PARAMETERS.filter((parameterName) => url.searchParams.get(parameterName)).map(
      (parameterName) => `${parameterName}=${url.searchParams.get(parameterName)}`,
    );
    const postingPath = url.pathname
      .replace(/\/(thanks|thank-you|confirmation|submitted|success)\/?$/i, '')
      .replace(/\/(apply|application|applications|apply-now)(\/.*)?$/i, '')
      .replace(/\/(form)\/?$/i, '')
      .replace(/^\/[a-z]{2}(-[A-Za-z]{2})?(?=\/)/, '')
      .replace(/\/+$/, '');
    return `${url.host}${postingPath}${idParameters.length ? `?${idParameters.join('&')}` : ''}`.toLowerCase();
  } catch {
    return pageUrl.toLowerCase();
  }
}

/** Question labels vary in punctuation and asterisks between pages; compare their words. */
export function labelKey(questionLabel: string): string {
  return questionLabel
    .toLowerCase()
    .replace(/\(required\)|\*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 160);
}
