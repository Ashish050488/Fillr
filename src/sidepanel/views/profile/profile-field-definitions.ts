import { listCountryNames } from './country-names';

export interface ProfileFieldDefinition {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date';
  /** Shown inside the empty field, never squeezed next to the label. */
  placeholder?: string;
  /** Standard answers: rendered as a dropdown, with "Other…" for anything else. */
  options?: string[] | (() => string[]);
}

const YES_NO = ['Yes', 'No'];
const YEARS_LISTED = 50;
const YEARS_AHEAD = 6;

function listGraduationYears(): string[] {
  const latestYear = new Date().getFullYear() + YEARS_AHEAD;
  return Array.from({ length: YEARS_LISTED }, (_, yearOffset) => String(latestYear - yearOffset));
}

/** Every profile field, grouped as the Profile tab shows them. */
export const PROFILE_FIELD_GROUPS: Array<[string, ProfileFieldDefinition[]]> = [
  [
    'You',
    [
      { key: 'firstName', label: 'First name' },
      { key: 'lastName', label: 'Last name' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'preferredName', label: 'Preferred name', placeholder: 'Optional' },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210' },
      { key: 'location', label: 'City' },
      { key: 'state', label: 'State / province' },
      { key: 'country', label: 'Country', options: listCountryNames },
      { key: 'postalCode', label: 'PIN / postal code' },
      { key: 'addressLine1', label: 'Street address' },
    ],
  ],
  [
    'Links',
    [
      { key: 'linkedin', label: 'LinkedIn', type: 'url', placeholder: 'linkedin.com/in/…' },
      { key: 'github', label: 'GitHub', type: 'url', placeholder: 'github.com/…' },
      { key: 'portfolio', label: 'Website', type: 'url', placeholder: 'Portfolio or personal site' },
    ],
  ],
  [
    'Work',
    [
      { key: 'currentTitle', label: 'Current job title' },
      { key: 'currentCompany', label: 'Current company' },
      { key: 'yearsExperience', label: 'Years of experience', placeholder: 'e.g. 3.5' },
      { key: 'headline', label: 'Headline' },
    ],
  ],
  [
    'Education',
    [
      {
        key: 'degree',
        label: 'Highest degree',
        options: [
          'Class 12 / High school',
          'Diploma',
          'B.Tech / B.E.',
          'B.Sc',
          'BCA',
          'B.Com',
          'B.A.',
          'BBA',
          'M.Tech / M.E.',
          'M.Sc',
          'MCA',
          'M.Com',
          'M.A.',
          'MBA / PGDM',
          'PhD',
        ],
      },
      {
        key: 'fieldOfStudy',
        label: 'Field of study',
        options: [
          'Computer Science',
          'Information Technology',
          'Electronics & Communication',
          'Electrical',
          'Mechanical',
          'Civil',
          'Chemical',
          'Data Science / AI',
          'Mathematics',
          'Physics',
          'Statistics',
          'Commerce',
          'Economics',
          'Business / Management',
          'Design',
          'Arts / Humanities',
        ],
      },
      { key: 'university', label: 'College / university' },
      { key: 'graduationYear', label: 'Graduation year', options: listGraduationYears },
      { key: 'gpa', label: 'CGPA / GPA / %', placeholder: 'e.g. 8.4/10 or 78%' },
    ],
  ],
  [
    'Preferences',
    [
      { key: 'preferredLocation', label: 'Preferred location', placeholder: 'e.g. Bengaluru, Remote' },
      { key: 'willingToRelocate', label: 'Open to relocation', options: YES_NO },
      { key: 'workPreference', label: 'Work mode', options: ['Remote', 'Hybrid', 'On-site', 'Any'] },
      {
        key: 'earliestStart',
        label: 'Earliest start',
        options: ['Immediately', '15 days', '30 days', '45 days', '60 days', '90 days'],
      },
      {
        key: 'heardAbout',
        label: 'Usually heard via',
        options: [
          'LinkedIn',
          'Naukri',
          'Indeed',
          'Company website',
          'Employee referral',
          'Glassdoor',
          'Job board',
          'Instahyre',
          'Wellfound',
        ],
      },
    ],
  ],
  [
    'Personal',
    [
      { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
      { key: 'nationality', label: 'Nationality', options: listCountryNames },
      { key: 'gender', label: 'Gender', options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      { key: 'pronouns', label: 'Pronouns', options: ['He/him', 'She/her', 'They/them', 'Prefer not to say'] },
    ],
  ],
  [
    'Usual answers',
    [
      { key: 'currentCtc', label: 'Current CTC', placeholder: 'e.g. 12 LPA' },
      { key: 'expectedCtc', label: 'Expected CTC', placeholder: 'e.g. 18 LPA' },
      {
        key: 'noticePeriod',
        label: 'Notice period',
        options: ['Immediate', '15 days', '30 days', '45 days', '60 days', '90 days'],
      },
      { key: 'workAuthorization', label: 'Authorised to work', options: YES_NO },
      { key: 'sponsorship', label: 'Needs visa sponsorship', options: YES_NO },
    ],
  ],
];

/** Fields left blank on purpose get a note, so "empty" never looks like a bug. */
export const BLANK_FIELD_NOTES: Record<string, string> = {
  gender: 'Left blank, forms get "Decline to self-identify".',
  dateOfBirth: 'Only filled where you add it.',
  currentCtc: 'Only filled where you add it.',
};
