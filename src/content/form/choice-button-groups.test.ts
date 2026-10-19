import { describe, expect, it } from 'vitest';
import { chooseOptionForAnswer } from './choice-button-groups';

const HEARD_ABOUT = ['News', 'Job board', 'Social media (Linkedin, Instagram, X, etc.)', 'Events', 'Referral', 'Other'];

describe('chooseOptionForAnswer', () => {
  it('matches exactly, ignoring case', () => {
    expect(chooseOptionForAnswer(['Yes', 'No'], 'no')).toBe(1);
  });

  it('reads a sentence answer that starts with an option', () => {
    expect(chooseOptionForAnswer(['Yes', 'No'], 'Yes, I am happy to relocate to Munich.')).toBe(0);
    expect(chooseOptionForAnswer(['Yes', 'No'], 'No.')).toBe(1);
  });

  it('finds the option that names a short answer', () => {
    expect(chooseOptionForAnswer(HEARD_ABOUT, 'LinkedIn')).toBe(2);
  });

  it('never treats "Not sure" as "No" or picks anything for an unrelated answer', () => {
    expect(chooseOptionForAnswer(['Yes', 'No'], 'Not sure')).toBe(-1);
    expect(chooseOptionForAnswer(HEARD_ABOUT, 'Podcast')).toBe(-1);
  });
});
