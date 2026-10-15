/**
 * Y Combinator job pages (ycombinator.com/companies/{slug}/jobs/{id}) carry the whole company and
 * job as page data: what they build, their batch, every founder's bio and who reads applications.
 * That is what makes a note to a founder personal, so it is read in full and kept together.
 */
type JsonObject = Record<string, unknown>;

const YC_HOST = /(^|\.)(ycombinator\.com|workatastartup\.com)$/i;
const MAXIMUM_ABOUT_LENGTH = 2500;
const MAXIMUM_BIO_LENGTH = 700;
const MAXIMUM_DESCRIPTION_LENGTH = 5000;

export interface YcJobBrief {
  title: string;
  company: string;
  /** Plain text for the writer: company, founders, who reads it, then the job itself. */
  brief: string;
}

export function isYcJobUrl(pageUrl: string | undefined): boolean {
  try {
    return YC_HOST.test(new URL(pageUrl ?? '').hostname);
  } catch {
    return false;
  }
}

const readText = (jsonField: unknown) => (typeof jsonField === 'string' ? jsonField.trim() : '');
const readObject = (jsonField: unknown) => (jsonField && typeof jsonField === 'object' ? jsonField : {}) as JsonObject;

/** Their markdown ("# **About us**") as plain text. */
function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/\r/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function describeFounders(founders: unknown): string[] {
  if (!Array.isArray(founders)) return [];
  return founders
    .map(readObject)
    .filter((founder) => founder.is_active !== false && readText(founder.full_name))
    .map((founder) => {
      const role = readText(founder.title);
      const bio = stripMarkdown(readText(founder.founder_bio)).slice(0, MAXIMUM_BIO_LENGTH);
      return `* ${readText(founder.full_name)}${role ? ` (${role})` : ''}${bio ? `: ${bio}` : ''}`;
    });
}

const labelled = (label: string, fieldValue: unknown) => {
  const text = Array.isArray(fieldValue) ? fieldValue.map(readText).filter(Boolean).join(', ') : readText(fieldValue);
  return text ? `${label}: ${text}` : '';
};

/** The page's props ({company, job}) as a brief, or undefined when this is not a YC job page. */
export function buildYcJobBrief(pageProps: unknown): YcJobBrief | undefined {
  const company = readObject(readObject(pageProps).company);
  const job = readObject(readObject(pageProps).job);
  const title = readText(job.title);
  const companyName = readText(company.name) || readText(job.companyName);
  if (!title || !companyName) return undefined;
  const hiringManager = readObject(job.hiringManager);
  const hiringManagerName = [readText(hiringManager.first_name), readText(hiringManager.last_name)]
    .filter(Boolean)
    .join(' ');
  const about = stripMarkdown(readText(company.hiring_description) || readText(company.long_description));
  const skills = Array.isArray(job.skills)
    ? job.skills.map((skill) => readText(readObject(skill).name) || readText(skill))
    : [];
  const founderLines = describeFounders(company.founders);
  const sections = [
    `${companyName} (Y Combinator ${readText(company.batch_name) || readText(job.companyBatchName)}): ${readText(company.one_liner) || readText(job.companyOneLiner)}`,
    [
      labelled('Team size', String(company.team_size ?? '')),
      labelled('Company location', company.location),
      labelled('Website', company.website),
    ]
      .filter(Boolean)
      .join(' | '),
    hiringManagerName ? `Your note goes to: ${hiringManagerName}` : '',
    founderLines.length ? `Founders:\n${founderLines.join('\n')}` : '',
    about ? `About the company:\n${about.slice(0, MAXIMUM_ABOUT_LENGTH)}` : '',
    [
      `Role: ${title}`,
      labelled('Location', job.location),
      labelled('Type', job.type),
      labelled('Salary', job.salaryRange),
      labelled('Equity', job.equityRange),
      labelled('Experience', job.minExperience),
      labelled('Visa', job.visa),
      labelled('Skills', skills),
    ]
      .filter(Boolean)
      .join('\n'),
    `Job description:\n${stripMarkdown(readText(job.description)).slice(0, MAXIMUM_DESCRIPTION_LENGTH)}`,
  ];
  return { title, company: companyName, brief: sections.filter(Boolean).join('\n\n') };
}
