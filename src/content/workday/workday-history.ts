/**
 * Workday's "My Experience" step: repeatable Work Experience / Education / Websites entries that
 * only exist after clicking "Add", each with its own Job Title, Company, From/To dates and so on.
 * The generic matcher would put your current title into every entry, so entries are filled here,
 * one resume item per entry, and excluded from the generic pass.
 */
import { ensureEntryBlocks, fillEntryControl, fillEntryDate } from './workday-entry-fields';
import { findAddButton, findEntryBlocks, findLabelledControl, isWorkday, readText, wait } from './workday-page';

export { insideEntries, isWorkday } from './workday-page';
export { attachWorkdayResume } from './workday-resume-upload';
export { fillWorkdaySkills } from './workday-skills';

type ResumeEntry = Record<string, unknown>;
export interface History {
  experience: ResumeEntry[];
  education: ResumeEntry[];
  links: string[];
  skills?: string[];
}

const MAXIMUM_JOBS = 4;
const MAXIMUM_SCHOOLS = 3;
const MAXIMUM_WEBSITES = 3;
const isCurrentRole = (endDate: unknown) => /present|current|now|till date|ongoing/i.test(readText(endDate));

const hasSection = (sectionTitle: RegExp) =>
  findEntryBlocks(sectionTitle).length > 0 || Boolean(findAddButton(sectionTitle));

async function fillJobEntries(jobs: ResumeEntry[], touched: Set<Element>): Promise<void> {
  const jobBlocks = await ensureEntryBlocks(/work experience/i, jobs.length);
  for (const [jobIndex, jobBlock] of jobBlocks.entries()) {
    const job = jobs[jobIndex];
    await fillEntryControl(findLabelledControl(jobBlock, /^job title/i), readText(job.title), touched);
    await fillEntryControl(findLabelledControl(jobBlock, /^company/i), readText(job.company), touched);
    await fillEntryControl(findLabelledControl(jobBlock, /^location/i), readText(job.location), touched);
    const isCurrent = isCurrentRole(job.endDate);
    const currentCheckbox = findLabelledControl(jobBlock, /currently work here/i);
    if (
      isCurrent &&
      currentCheckbox instanceof HTMLInputElement &&
      currentCheckbox.type === 'checkbox' &&
      !currentCheckbox.checked
    ) {
      currentCheckbox.click();
      touched.add(currentCheckbox);
      await wait(200);
    }
    await fillEntryDate(jobBlock, /^(from|start)/i, job.startDate, touched);
    if (!isCurrent) await fillEntryDate(jobBlock, /^(to|end)/i, job.endDate, touched);
    const descriptionControl = findLabelledControl(jobBlock, /role description|description|responsibilities/i);
    await fillEntryControl(descriptionControl, readText(job.description), touched);
  }
}

async function fillEducationEntries(schools: ResumeEntry[], touched: Set<Element>): Promise<void> {
  const schoolBlocks = await ensureEntryBlocks(/education/i, schools.length);
  for (const [schoolIndex, schoolBlock] of schoolBlocks.entries()) {
    const school = schools[schoolIndex];
    const schoolControl = findLabelledControl(schoolBlock, /school|university|institution|college/i);
    await fillEntryControl(schoolControl, readText(school.institution), touched);
    await fillEntryControl(findLabelledControl(schoolBlock, /^degree/i), readText(school.degree), touched);
    await fillEntryControl(findLabelledControl(schoolBlock, /field of study|major/i), readText(school.field), touched);
    const gradeText = readText(school.details).match(/(\d{1,2}\.\d{1,2})\s*(\/\s*\d+)?/)?.[0];
    if (gradeText)
      await fillEntryControl(findLabelledControl(schoolBlock, /overall result|gpa|grade/i), gradeText, touched);
    await fillEntryDate(schoolBlock, /^(from|start)/i, school.startDate, touched, true);
    await fillEntryDate(schoolBlock, /^(to|end|actual or expected)/i, school.endDate, touched, true);
  }
}

/** Fills My Experience entries; returns every control it touched so the generic pass skips them. */
export async function fillWorkdayHistory(history: History): Promise<Set<Element>> {
  const touched = new Set<Element>();
  if (!isWorkday()) return touched;
  const jobs = history.experience.slice(0, MAXIMUM_JOBS);
  if (jobs.length && hasSection(/work experience/i)) await fillJobEntries(jobs, touched);
  const schools = history.education.slice(0, MAXIMUM_SCHOOLS);
  if (schools.length && hasSection(/education/i)) await fillEducationEntries(schools, touched);
  const websites = history.links.filter(Boolean).slice(0, MAXIMUM_WEBSITES);
  if (websites.length && findAddButton(/websites?/i)) {
    const websiteBlocks = await ensureEntryBlocks(/websites?/i, websites.length);
    for (const [websiteIndex, websiteBlock] of websiteBlocks.entries()) {
      await fillEntryControl(findLabelledControl(websiteBlock, /url/i), websites[websiteIndex], touched);
    }
  }
  return touched;
}
