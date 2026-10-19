import { describe, expect, it } from 'vitest';
import { derivedFields, yearsOfExperience } from './derived-profile-fields';

describe('derived profile fields', () => {
  it('derives current role and education from the parsed resume', () => {
    expect(
      derivedFields({
        workExperience: [
          { company: 'Acme', title: 'SDE II', startDate: 'Jan 2023', endDate: 'Present' },
          { company: 'Old', title: 'Intern', endDate: '2022' },
        ],
        education: [
          {
            institution: 'IIT Madras',
            degree: 'B.Tech',
            field: 'Computer Science',
            endDate: '2022',
            details: 'CGPA: 8.7/10',
          },
        ],
      }),
    ).toMatchObject({
      currentTitle: 'SDE II',
      currentCompany: 'Acme',
      university: 'IIT Madras',
      degree: 'B.Tech',
      fieldOfStudy: 'Computer Science',
      graduationYear: '2022',
      gpa: '8.7/10',
    });
  });
});

describe('yearsOfExperience', () => {
  const now = new Date(2026, 9, 1);
  it('adds up full-time jobs, skips internships and counts overlaps once', () => {
    const jobs = [
      { title: 'Software Engineer', startDate: 'Jan 2024', endDate: 'Present' },
      { title: 'Freelance Developer', startDate: 'Jun 2024', endDate: 'Dec 2024' },
      { title: 'Software Engineering Intern', startDate: 'Jan 2023', endDate: 'Jun 2023' },
    ];
    expect(yearsOfExperience(jobs, now)).toBe('3');
  });

  it('is empty when no dates can be read', () => {
    expect(yearsOfExperience([{ title: 'Engineer', startDate: '', endDate: '' }], now)).toBe('');
  });
});
