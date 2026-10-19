import { readAccessibleFieldSignals, readFieldMetadata } from './accessible-field-signals';

export type ProfileValues = Record<string, string>;
export interface Match {
  key: string;
  value: string;
  score: number;
}

const aliases: Record<string, string[]> = {
  firstname: ['first name', 'given name', 'fname'],
  middlename: ['middle name'],
  lastname: ['last name', 'surname', 'family name', 'lname'],
  name: ['full name', 'your name', 'applicant name', 'name'],
  email: ['email', 'e mail', 'email address'],
  phone: ['phone', 'phone number', 'mobile', 'telephone', 'contact number'],
  location: ['city', 'location', 'current city'],
  country: ['country', 'country of residence'],
  linkedin: ['linkedin', 'linked in'],
  github: ['github', 'git hub'],
  portfolio: ['portfolio', 'personal website', 'website'],
  currentcompany: ['current company', 'current employer'],
  yearsexperience: [
    'years experience',
    'years of experience',
    'total experience',
    'years of professional experience',
    'years of work experience',
    'experience in years',
    'in years what is your experience',
    'how many years of experience',
  ],
  currentctc: ['current ctc', 'current salary', 'current compensation'],
  expectedctc: ['expected ctc', 'expected salary', 'desired salary'],
  noticeperiod: ['notice period'],
  workauthorization: ['work authorization', 'legally authorized to work'],
  sponsorship: ['require sponsorship', 'visa sponsorship'],
  resume: ['resume', 'cv', 'curriculum vitae'],
  phonecountrycode: [
    'country code',
    'dial code',
    'phone code',
    'isd code',
    'calling code',
    'country calling code',
    'country phone code',
  ],
  addressline1: ['address line 1', 'address 1', 'street address', 'address line one', 'street', 'address line1'],
  postalcode: ['postal code', 'zip code', 'zip', 'pin code', 'pincode', 'postcode'],
  state: ['state', 'province', 'state province', 'state or province'],
  phonedevicetype: ['phone device type', 'phone type', 'device type'],
  preferredname: ['preferred name', 'preferred first name', 'nickname', 'name you go by'],
  pronouns: ['pronouns', 'preferred pronouns'],
  dateofbirth: ['date of birth', 'dob', 'birth date', 'birthdate', 'birthday'],
  gender: ['gender', 'gender identity'],
  nationality: ['nationality', 'citizenship', 'country of citizenship'],
  currenttitle: [
    'current title',
    'current job title',
    'current designation',
    'current role',
    'current position',
    'designation',
    'job title',
  ],
  preferredlocation: ['preferred location', 'preferred city', 'preferred work location', 'preferred job location'],
  willingtorelocate: ['willing to relocate', 'open to relocation', 'relocate', 'relocation'],
  workpreference: ['work preference', 'work mode', 'work arrangement', 'preferred work mode', 'workplace preference'],
  earlieststart: [
    'earliest start date',
    'start date',
    'available to start',
    'availability date',
    'date of joining',
    'joining date',
    'when can you start',
    'preferred start date',
    'start date preference',
  ],
  heardabout: [
    'how did you hear',
    'how did you find',
    'where did you hear',
    'referral source',
    'source of application',
    'how did you learn about',
  ],
  university: ['university', 'college', 'school', 'institution', 'institute'],
  degree: ['degree', 'highest qualification', 'highest degree', 'qualification', 'education level'],
  fieldofstudy: ['field of study', 'major', 'discipline', 'specialization', 'specialisation', 'branch'],
  graduationyear: ['graduation year', 'year of graduation', 'passing year', 'year of passing', 'graduation date'],
  gpa: ['gpa', 'cgpa', 'grade point', 'percentage', 'aggregate'],
};
const autocomplete: Record<string, string> = {
  'given-name': 'firstname',
  'additional-name': 'middlename',
  'family-name': 'lastname',
  name: 'name',
  email: 'email',
  tel: 'phone',
  'address-level2': 'location',
  'country-name': 'country',
};

export function normalise(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function fieldSignals(element: Element): string[] {
  const input = element as HTMLInputElement;
  // Workday and other React ATSs name fields in data attributes, e.g. data-automation-id=
  // "legalNameSection_firstName" or a wrapper "formField-addressSection_city".
  const automation = [
    element.getAttribute('data-automation-id'),
    element.getAttribute('data-testid'),
    element.getAttribute('data-qa'),
    element
      .closest?.('[data-automation-id^="formField"]')
      ?.getAttribute('data-automation-id')
      ?.replace(/^formField-?/, ''),
  ].map((value) => (value ?? '').replace(/--/g, ' ').replace(/Section/g, ' '));
  return [
    ...readAccessibleFieldSignals(element),
    input.placeholder ?? '',
    input.name ?? '',
    input.id ?? '',
    ...readFieldMetadata(element),
    ...automation,
  ]
    .map(normalise)
    .filter(Boolean);
}

// A message box ("Reach out to Akash", "Tell us about you") is never your name or email; only a
// street address is sometimes asked for in a multi-line box.
const MULTI_LINE_PROFILE_KEYS = new Set(['addressline1']);

const isMultiLine = (element: Element) =>
  element.tagName === 'TEXTAREA' || (element as HTMLElement).isContentEditable === true;

export function bestMatch(element: Element, profile: ProfileValues): Match | undefined {
  const signals = fieldSignals(element);
  const isMessageBox = isMultiLine(element);
  const nearby = normalise(element.parentElement?.textContent?.slice(0, 180) ?? '');
  const type = (element as HTMLInputElement).type;
  const auto = (element.getAttribute('autocomplete') ?? '').split(/\s+/).pop() ?? '';
  const candidates: Match[] = [];
  for (const [key, value] of Object.entries(profile)) {
    if (!value.trim()) continue;
    const canonical = normalise(key).replace(/ /g, '');
    const terms = aliases[canonical];
    if (!terms || (isMessageBox && !MULTI_LINE_PROFILE_KEYS.has(canonical))) continue;
    if (
      canonical === 'name' &&
      signals.some((signal) => /\b(first|last|middle|given|family|company|user)\b/.test(signal))
    )
      continue;
    // "Phone country code" is the dial code, not the number.
    if (
      canonical === 'phone' &&
      signals.some((signal) =>
        /\b(country|dial|isd|calling)( phone)? code\b|\bextension\b|\bext\b|device type|phone type/.test(signal),
      )
    )
      continue;
    let score = 0;
    for (const signal of signals) {
      score = Math.max(
        score,
        ...terms.map((term) => (signal === term ? 12 : ` ${signal} `.includes(` ${term} `) ? 8 : 0)),
      );
    }
    if (autocomplete[auto] === canonical) score = 16;
    if (type === 'email' && canonical === 'email') score = Math.max(score, 10);
    if (type === 'tel' && canonical === 'phone') score = Math.max(score, 10);
    if (terms.some((term) => ` ${nearby} `.includes(` ${term} `))) score += 1;
    if (score >= 8) candidates.push({ key, value, score });
  }
  candidates.sort((left, right) => right.score - left.score);
  if (candidates[1] && candidates[0].score - candidates[1].score < 3) return undefined;
  return candidates[0];
}

/** The profile value a question's text asks for ("How did you hear?" → heardAbout); longest phrase wins. */
export function matchLabelToProfile(label: string, profile: ProfileValues): Match | undefined {
  const text = ` ${normalise(label)} `;
  let best: Match | undefined;
  for (const [key, value] of Object.entries(profile)) {
    if (!value.trim()) continue;
    for (const term of aliases[normalise(key).replace(/ /g, '')] ?? []) {
      if (text.includes(` ${term} `) && (!best || term.length > best.score)) best = { key, value, score: term.length };
    }
  }
  return best;
}
