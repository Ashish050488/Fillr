import { describe, expect, it } from 'vitest';
import { findDeclarationTopic, rememberedAnswerKey } from './declaration-topics';
import { findCountry } from '../geography/find-country';

// The Application Questions step of a real Workday (HPE) application.
const WORKDAY_QUESTIONS: Array<[string, string]> = [
  [
    'I have United States government or public institution employment experience (federal, state, or local) either as an employee or contractor/consultant.*',
    'government-employment',
  ],
  [
    'For any of the countries listed below: Are you a citizen or have a passport, or Have dual citizenship status, or Have been granted a permanent resident status, or Have been granted refugee or asylum status? Armenia, Azerbaijan, Belarus, China(PRC), Cuba, Iran, North Korea(DPRK), Russia, Syria, Ukraine, Venezuela*',
    'sanctioned-country-ties',
  ],
  [
    'HPE Policy prohibits employees from engaging in activities that pose a conflict(s) of interest for HPE such as: Outside employment with or receiving compensation from a customer; Significant financial interest in a customer held by you or a family member; Conducting business when someone you have a close personal or family relationship has a substantial role in that company*',
    'conflict-of-interest',
  ],
  [
    'Have you signed or accepted any agreement with a current or prior employer that includes restrictions on competition or solicitation, including, but not limited to, non-competition agreement, non-disclosure agreement, non-solicitation agreement?*',
    'restrictive-agreement',
  ],
  [
    'Certain Legal and ethical restrictions may apply with respect to relationships with government officials. In order to avoid even the appearance of a conflict of interest, please advise: Whether you have served or are serving in a government or public body that has regulatory authority over HPE or that purchases from HPE.*',
    'government-official-role',
  ],
  [
    'Certain Legal and ethical restrictions may apply. In order to avoid even the appearance of a conflict of interest, please advise: Whether a family member or anyone with whom you have a close personal relationship (a) is a current HPE employee; or (b) is a government official with regulatory authority over HPE*',
    'relative-at-company',
  ],
  [
    'For those locations or countries in which you are seeking employment, indicate all locations or countries for which you now, or in the future, require sponsorship for employment with HPE.*',
    'sponsorship',
  ],
  ['Do you possess a valid work permit in the country for which the position resides?*', 'work-permit'],
  ["Do you have a valid driver's license?*", 'drivers-license'],
  ['Are you at least 18 years of age?*', 'minimum-age'],
  ['Are you currently authorized to work in the United States of America?*', 'work-permit'],
  ['Do you now or in the future require visa sponsorship to continue working in the United States?*', 'sponsorship'],
  ['Do you possess a valid residency permit in the country for which the position resides?*', 'residency-permit'],
];

describe('declaration topics', () => {
  it.each(WORKDAY_QUESTIONS)('recognises %s', (questionLabel, expectedTopic) => {
    expect(findDeclarationTopic(questionLabel)?.topic).toBe(expectedTopic);
  });

  it('remembers country-specific answers per country and others once', () => {
    expect(rememberedAnswerKey('Do you possess a valid work permit?', 'India')).toBe('topic:work-permit@india');
    expect(rememberedAnswerKey('Are you legally authorized to work here?', 'India')).toBe('topic:work-permit@india');
    expect(rememberedAnswerKey('Have you signed a non-compete?', 'India')).toBe('topic:restrictive-agreement');
    expect(rememberedAnswerKey('Preferred shift?*')).toBe('question:preferred shift');
  });

  it('finds the country of a job location', () => {
    expect(findCountry('Bengaluru, Karnataka, India')).toBe('India');
    expect(findCountry('Remote - USA')).toBe('United States');
    expect(findCountry('Bangalore')).toBe('India');
    expect(findCountry('Papua New Guinea')).toBe('Papua New Guinea');
    expect(findCountry(undefined)).toBeUndefined();
  });
});
