/** Profile fields that come straight from the parsed resume lists, shared by the panel and the form filler. */
type Entry = Record<string, unknown>;
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTHS_PER_YEAR = 12;

/** "Jan 2022", "01/2022", "2022" or "Present" as a month count since year 0. */
function toMonthIndex(dateText: string, now: Date): number | undefined {
  if (/present|current|now|today/i.test(dateText)) return now.getFullYear() * MONTHS_PER_YEAR + now.getMonth();
  const year = Number(dateText.match(/\b(19|20)\d{2}\b/)?.[0]);
  if (!year) return undefined;
  const monthName = MONTHS.findIndex((month) => dateText.toLowerCase().includes(month));
  const monthNumber = Number(dateText.match(/\b(0?[1-9]|1[0-2])\s*[/.-]\s*(19|20)\d{2}\b/)?.[1] ?? 0);
  const month = monthName >= 0 ? monthName : monthNumber ? monthNumber - 1 : 0;
  return year * MONTHS_PER_YEAR + month;
}

/** Full-time years from your jobs, internships excluded, overlapping jobs counted once. */
export function yearsOfExperience(jobs: Entry[], now = new Date()): string {
  const coveredMonths = new Set<number>();
  for (const job of jobs) {
    if (/\bintern(ship)?\b|trainee|apprentice/i.test(`${text(job.title)} ${text(job.company)}`)) continue;
    const start = toMonthIndex(text(job.startDate), now);
    const end = toMonthIndex(text(job.endDate) || 'present', now);
    if (start === undefined || end === undefined || end < start) continue;
    for (let month = start; month <= end; month += 1) coveredMonths.add(month);
  }
  if (!coveredMonths.size) return '';
  return String(Math.round((coveredMonths.size / MONTHS_PER_YEAR) * 2) / 2);
}

/** Current role and education from the parsed resume lists, so those fields never need retyping. */
export function derivedFields(profile: { workExperience: unknown[]; education: unknown[] }): Record<string, string> {
  const jobs = profile.workExperience as Entry[];
  const current = jobs.find((job) => /present|current|now/i.test(text(job.endDate))) ?? jobs[0];
  const studies = profile.education as Entry[];
  const latest = [...studies].sort(
    (left, right) =>
      Number(text(right.endDate).match(/\d{4}/)?.[0] ?? 0) - Number(text(left.endDate).match(/\d{4}/)?.[0] ?? 0),
  )[0];
  const gpa =
    text(latest?.details).match(/(?:c?gpa|cgpa|grade|percentage|score)[:\s]*([\d.]+\s*(?:\/\s*\d+|%)?)/i)?.[1] ??
    text(latest?.details).match(/\b(\d{1,2}\.\d{1,2})\s*\/\s*10\b/)?.[0];
  return {
    currentTitle: text(current?.title),
    currentCompany: text(current?.company),
    university: text(latest?.institution),
    degree: text(latest?.degree),
    fieldOfStudy: text(latest?.field),
    graduationYear: text(latest?.endDate).match(/\b(19|20)\d{2}\b/)?.[0] ?? '',
    gpa: gpa ?? '',
    yearsExperience: yearsOfExperience(jobs),
  };
}
