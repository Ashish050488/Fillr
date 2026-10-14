import { describe, expect, it } from 'vitest';
import { derivedFields } from './derived-profile-fields';

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
