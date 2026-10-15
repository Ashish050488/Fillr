import { describe, expect, it } from 'vitest';
import { appendLinks, fitInvitationNote } from './referral-draft-service';

describe('fitInvitationNote', () => {
  it('keeps a short note as one line', () => {
    expect(fitInvitationNote('Hi Akash,\nloved your post on agent evals.')).toBe(
      'Hi Akash, loved your post on agent evals.',
    );
  });

  it('cuts a long note at a full sentence or word, never mid-word, within 200 characters', () => {
    const longNote = `Hi Akash, your post on agent evals at Zudo was sharp. ${'I built eval tooling for LLM pipelines and shipped it to production users. '.repeat(3)}`;
    const note = fitInvitationNote(longNote);
    expect(note.length).toBeLessThanOrEqual(200);
    expect(note).toMatch(/[.?]$/);
    expect(longNote.replace(/\s+/g, ' ')).toContain(note.replace(/\.$/, ''));
  });
});

describe('appendLinks', () => {
  it('puts the job and resume links before the sign-off', () => {
    expect(
      appendLinks('Hi Akash,\n\nWould you refer me?\n\nAshish', {
        jobUrl: 'https://zudo.ai/jobs/1',
        resumeLink: 'https://drive.google.com/file/d/abc/view',
      }),
    ).toBe(
      'Hi Akash,\n\nWould you refer me?\n\nJob: https://zudo.ai/jobs/1\nMy resume: https://drive.google.com/file/d/abc/view\n\nAshish',
    );
  });

  it('leaves the message alone without links', () => {
    expect(appendLinks('Hi Akash,\n\nThanks!', {})).toBe('Hi Akash,\n\nThanks!');
  });
});
