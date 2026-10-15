import { describe, expect, it } from 'vitest';
import { findCompanyName, findRecipientName, greetByName } from './note-recipient';

describe('findRecipientName', () => {
  it('reads the name from Wellfound and YC wording', () => {
    expect(findRecipientName('hiring manager\nReach out to Akash at Zudo\nStart a conversation')).toBe('Akash');
    expect(findRecipientName('Write a note to Sam about why you are interested')).toBe('Sam');
    expect(findRecipientName('Your note goes to: Jay Chia')).toBe('Jay');
  });

  it('does not invent a name', () => {
    expect(findRecipientName('Start a conversation with the team at Zudo.')).toBeUndefined();
    expect(findRecipientName('Reach out to the team')).toBeUndefined();
    expect(findRecipientName('Write a note to Hiring manager')).toBeUndefined();
  });
});

describe('greetByName', () => {
  it('replaces a team greeting with the person', () => {
    expect(greetByName('Hi Zudo team,\n\nI built X.', 'Akash')).toBe('Hi Akash,\n\nI built X.');
    expect(greetByName('Hello there, I built X.', 'Akash')).toBe('Hi Akash,\n\nI built X.');
  });

  it('adds a greeting when the note has none, and leaves it alone without a name', () => {
    expect(greetByName('I built X.', 'Akash')).toBe('Hi Akash,\n\nI built X.');
    expect(greetByName('Hi Zudo team,\n\nI built X.', undefined)).toBe('Hi Zudo team,\n\nI built X.');
  });
});

describe('findCompanyName', () => {
  it('reads the company from the apply popup', () => {
    expect(findCompanyName('hiring manager\nReach out to Vedant at Salus\nStart a conversation')).toBe('Salus');
    expect(findCompanyName('Start a conversation with the team at Zudo. Share something')).toBe('Zudo');
    expect(findCompanyName('Apply now')).toBeUndefined();
  });
});
