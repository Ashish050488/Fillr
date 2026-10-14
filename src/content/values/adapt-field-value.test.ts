import { describe, expect, it } from 'vitest';
import { extractLinks, parseResumeDate, totalExperienceYears } from '../../shared/resume/resume-facts';
import { adaptValue, closestOption, declineOption, matchOption, toAnnualAmount, toDays } from './adapt-field-value';

const now = new Date(2026, 9, 13);

describe('resume links', () => {
  it('reads links hidden in PDF annotations, keeping only the GitHub profile', () => {
    const links = extractLinks('Jane Doe | LinkedIn | GitHub | Portfolio', [
      'https://www.linkedin.com/in/jane-doe/?trk=x',
      'https://github.com/janedoe/payments-api',
      'https://janedoe.dev/',
      'mailto:jane@example.com',
    ]);
    expect(links).toEqual({
      linkedin: 'https://www.linkedin.com/in/jane-doe',
      github: 'https://github.com/janedoe',
      portfolio: 'https://janedoe.dev',
      email: 'jane@example.com',
    });
  });

  it('finds bare links in text and ignores social sites as portfolio', () => {
    const links = extractLinks(
      'linkedin.com/in/jd · github.com/jd · leetcode.com/jd · jd.vercel.app · jd@gmail.com',
      [],
    );
    expect(links.linkedin).toBe('https://linkedin.com/in/jd');
    expect(links.github).toBe('https://github.com/jd');
    expect(links.portfolio).toBe('https://jd.vercel.app');
  });
});

describe('experience', () => {
  it('parses common resume dates', () => {
    expect(parseResumeDate('Jan 2022', now)).toBe(2022 * 12);
    expect(parseResumeDate('03/2021', now)).toBe(2021 * 12 + 2);
    expect(parseResumeDate("Aug '19", now)).toBe(2019 * 12 + 7);
    expect(parseResumeDate('Present', now)).toBe(2026 * 12 + 9);
  });

  it('merges overlapping roles and ignores internships when there is full-time work', () => {
    expect(
      totalExperienceYears(
        [
          { title: 'Engineer', startDate: 'Jan 2022', endDate: 'Present' },
          { title: 'Freelance', startDate: 'Jun 2023', endDate: 'Dec 2023' },
          { title: 'Software Intern', startDate: 'Jan 2021', endDate: 'Dec 2021' },
        ],
        now,
      ),
    ).toBe(4.8);
    expect(totalExperienceYears([{ title: 'Intern', startDate: 'Jan 2026', endDate: 'Jun 2026' }], now)).toBe(0.5);
  });
});

describe('notice period', () => {
  it('normalises to days', () => {
    expect(toDays('2 months')).toBe(60);
    expect(toDays('Immediate')).toBe(0);
    expect(toDays('3 weeks')).toBe(21);
    expect(toDays('45')).toBe(45);
    expect(toDays('one month')).toBe(30);
  });

  it('fills in the unit the field asks for', () => {
    expect(adaptValue('noticePeriod', '60 days', { label: 'Notice period (in weeks)', type: 'text' })).toBe('9');
    expect(adaptValue('noticePeriod', '2 months', { label: 'Notice period in days', type: 'number' })).toBe('60');
    expect(adaptValue('noticePeriod', '45 days', { label: 'Notice period (months)', type: 'text' })).toBe('1.5');
    expect(adaptValue('noticePeriod', '30', { label: 'Notice period', type: 'text' })).toBe('1 month');
  });

  it('picks the right dropdown option', () => {
    const options = ['Immediate', '15 days or less', '1 month', '2 months', '3 months', 'More than 3 months'];
    expect(adaptValue('noticePeriod', '60 days', { label: 'Notice', type: 'select-one', options })).toBe('2 months');
    expect(adaptValue('noticePeriod', '10 days', { label: 'Notice', type: 'select-one', options })).toBe(
      '15 days or less',
    );
    expect(adaptValue('noticePeriod', '0', { label: 'Notice', type: 'select-one', options })).toBe('Immediate');
    expect(adaptValue('noticePeriod', '120 days', { label: 'Notice', type: 'select-one', options })).toBe(
      'More than 3 months',
    );
  });
});

describe('experience and salary units', () => {
  it('converts years to months and picks ranges', () => {
    expect(adaptValue('yearsExperience', '4.8', { label: 'Total experience (in months)', type: 'text' })).toBe('58');
    expect(adaptValue('yearsExperience', '4.8', { label: 'Years of experience', type: 'number' })).toBe('4');
    expect(
      adaptValue('yearsExperience', '4.8', {
        label: 'Experience',
        type: 'select-one',
        options: ['0-2 years', '3-5 years', '5+ years'],
      }),
    ).toBe('3-5 years');
  });

  it('understands LPA, lakhs, crore and monthly amounts', () => {
    expect(toAnnualAmount('12 LPA')).toBe(1_200_000);
    expect(toAnnualAmount('12,00,000')).toBe(1_200_000);
    expect(toAnnualAmount('1.2 cr')).toBe(12_000_000);
    expect(toAnnualAmount('$120k')).toBe(120_000);
    expect(toAnnualAmount('1,00,000 per month')).toBe(1_200_000);
    expect(adaptValue('expectedCtc', '18 LPA', { label: 'Expected CTC (in LPA)', type: 'text' })).toBe('18');
    expect(adaptValue('expectedCtc', '18 LPA', { label: 'Expected salary per month', type: 'number' })).toBe('150000');
    expect(adaptValue('expectedCtc', '18 LPA', { label: 'Expected CTC', type: 'number' })).toBe('1800000');
    expect(closestOption(['5-10 LPA', '10-20 LPA', '20+ LPA'], 18, (value) => value)).toBe('10-20 LPA');
  });
});

describe('dropdown matching', () => {
  it('handles countries, yes/no and dial codes', () => {
    expect(matchOption(['United States', 'India', 'Canada'], 'USA')).toBe('United States');
    expect(matchOption(['Yes, I am authorized', 'No'], 'yes')).toBe('Yes, I am authorized');
    expect(
      adaptValue('phoneCountryCode', '91', {
        label: 'Country code',
        type: 'select-one',
        options: ['United States (+1)', 'India (+91)', 'UAE (+971)'],
      }),
    ).toBe('India (+91)');
    expect(adaptValue('phone', '+91 98765 43210', { label: 'Mobile number', type: 'tel', maxLength: 10 })).toBe(
      '9876543210',
    );
    expect(declineOption(['Male', 'Female', 'Decline to self-identify'])).toBe('Decline to self-identify');
  });
});

describe('length limits', () => {
  it('trims to maxlength at a sentence or word boundary', async () => {
    const { fitLength } = await import('../form/set-field-value');
    expect(fitLength('I build APIs. I also lead on-call rotations for payments.', 20)).toBe('I build APIs.');
    expect(fitLength('one two three four five', 12)).toBe('one two');
    expect(fitLength('short', 0)).toBe('short');
  });
});

describe('name casing', () => {
  it('turns capitals into a proper name but keeps deliberate casing', async () => {
    const { properName } = await import('../../shared/resume/resume-facts');
    expect(properName('ASHISH RANJAN')).toBe('Ashish Ranjan');
    expect(properName("mary-jane o'neil")).toBe("Mary-Jane O'Neil");
    expect(properName('MCDONALD')).toBe('McDonald');
    expect(properName('DeSouza')).toBe('DeSouza');
    expect(adaptValue('firstName', 'ASHISH', { label: 'First name', type: 'text' })).toBe('Ashish');
  });
});

describe('Workday phone fields', () => {
  it('drops the country code when the form has its own Country Phone Code field', () => {
    expect(adaptValue('phone', '+91 98355 90439', { label: 'Phone Number', type: 'text', dialCodeField: true })).toBe(
      '9835590439',
    );
    expect(adaptValue('phone', '+91 98355 90439', { label: 'Phone Number', type: 'tel' })).toBe('+91 98355 90439');
  });
});
