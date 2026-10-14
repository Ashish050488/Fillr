/**
 * Deterministic resume facts that AI models often miss or get wrong:
 * profile links (frequently stored only as PDF link annotations) and total experience.
 */

const SOCIAL_NOT_PORTFOLIO =
  /(linkedin\.com|github\.com|mailto:|tel:|twitter\.com|x\.com|facebook\.com|instagram\.com|leetcode\.com|hackerrank\.com|codechef\.com|codeforces\.com|kaggle\.com|medium\.com|stackoverflow\.com|google\.com|wa\.me|t\.me)/i;
const URL_PATTERN = /\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,;|()<>"']*)?/gi;

function normaliseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/[.,;:)\]]+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/\//, '')}`;
}

export interface ResumeLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  email?: string;
  phone?: string;
}

/** Pick profile links from PDF link annotations first (most reliable), then from the text. */
export function extractLinks(text: string, annotationUrls: string[] = []): ResumeLinks {
  const links: ResumeLinks = {};
  const email =
    annotationUrls
      .find((url) => /^mailto:/i.test(url))
      ?.replace(/^mailto:/i, '')
      .split('?')[0] ?? text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0];
  if (email) links.email = email;
  const phone = annotationUrls.find((url) => /^tel:/i.test(url))?.replace(/^tel:/i, '');
  if (phone) links.phone = decodeURIComponent(phone);

  const textUrls = (text.match(URL_PATTERN) ?? []).filter(
    (url) => !url.includes('@') && /[a-z]/i.test(url.split('.').pop() ?? ''),
  );
  const candidates = [...annotationUrls.filter((url) => /^https?:|^www\./i.test(url)), ...textUrls].map(normaliseUrl);
  for (const url of candidates) {
    const lower = url.toLowerCase();
    if (!links.linkedin && /linkedin\.com\/(in|pub)\/[^/?#\s]+/.test(lower))
      links.linkedin = url.split(/[?#]/)[0].replace(/\/+$/, '');
    else if (
      !links.github &&
      /(^|\/\/|\.)github\.com\/[a-z0-9-]+/i.test(lower) &&
      !/github\.com\/(features|about|pricing|login)/.test(lower)
    ) {
      // Keep just the profile: github.com/user, not a single repository.
      const user = lower.match(/github\.com\/([a-z0-9-]+)/i)?.[1];
      if (user) links.github = `https://github.com/${url.match(/github\.com\/([A-Za-z0-9-]+)/)?.[1] ?? user}`;
    } else if (
      !links.portfolio &&
      !SOCIAL_NOT_PORTFOLIO.test(lower) &&
      !/\.(pdf|png|jpe?g|docx?)$/i.test(lower) &&
      !(
        links.email &&
        lower.includes(links.email.split('@')[1] ?? '\u0000') &&
        /gmail|yahoo|outlook|hotmail/.test(lower)
      )
    ) {
      links.portfolio = url.replace(/\/+$/, '');
    }
  }
  return links;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Month index since year 0 for resume-style dates; undefined when unparseable. */
export function parseResumeDate(raw: string | undefined, now = new Date()): number | undefined {
  if (!raw) return undefined;
  const text = raw.toLowerCase().trim();
  if (/present|current|now|till date|to date|ongoing|today/.test(text)) return now.getFullYear() * 12 + now.getMonth();
  const year = text.match(/\b(19|20)\d{2}\b/)?.[0];
  if (year) {
    const name = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\b/)?.[1];
    const numeric =
      text.match(/\b(\d{1,2})[/.-](?:19|20)\d{2}\b/)?.[1] ?? text.match(/\b(?:19|20)\d{2}[/.-](\d{1,2})\b/)?.[1];
    const month = name
      ? MONTHS[name]
      : numeric && Number(numeric) >= 1 && Number(numeric) <= 12
        ? Number(numeric) - 1
        : 0;
    return Number(year) * 12 + month;
  }
  const short = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s*'?(\d{2})\b/);
  if (short) return (2000 + Number(short[2])) * 12 + MONTHS[short[1]];
  return undefined;
}

interface Role {
  title?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Total professional experience in years, merging overlapping roles.
 * Internships count only when there is no full-time history at all.
 */
export function totalExperienceYears(roles: Role[], now = new Date()): number | undefined {
  const isIntern = (role: Role) => /\b(intern|internship|trainee|apprentice)\b/i.test(`${role.title ?? ''}`);
  const pool = roles.some((role) => !isIntern(role)) ? roles.filter((role) => !isIntern(role)) : roles;
  const spans = pool
    .map((role) => {
      const start = parseResumeDate(role.startDate, now);
      const end = role.endDate
        ? parseResumeDate(role.endDate, now)
        : start === undefined
          ? undefined
          : now.getFullYear() * 12 + now.getMonth();
      return start !== undefined && end !== undefined && end >= start ? ([start, end + 1] as const) : undefined;
    })
    .filter((span): span is readonly [number, number] => Boolean(span))
    .sort((left, right) => left[0] - right[0]);
  if (!spans.length) return undefined;
  let months = 0;
  let [from, to] = spans[0];
  for (const [start, end] of spans.slice(1)) {
    if (start <= to) to = Math.max(to, end);
    else {
      months += to - from;
      [from, to] = [start, end];
    }
  }
  months += to - from;
  return Math.round((months / 12) * 10) / 10;
}

/**
 * "ASHISH RANJAN" or "ashish ranjan" → "Ashish Ranjan". Workday and several ATSs reject
 * all-caps names. Mixed casing the person chose ("McDonald", "DeSouza") is left untouched.
 */
export function properName(value: string): string {
  const letters = value.replace(/[^\p{L}]/gu, '');
  if (!letters || (letters !== letters.toUpperCase() && letters !== letters.toLowerCase())) return value;
  return value
    .toLowerCase()
    .replace(/(^|[\s\-'’.])(\p{L})/gu, (_match, lead: string, letter: string) => lead + letter.toUpperCase())
    .replace(/\bMc(\p{L})/gu, (_match, letter: string) => `Mc${letter.toUpperCase()}`);
}
