import { describe, expect, it } from 'vitest';
import { toTailoredResume } from './resume-tailor-service';

describe('toTailoredResume', () => {
  it('splits bullets into source and text and keywords into a unique list', () => {
    const tailored = toTailoredResume(
      {
        summary: ' Backend engineer focused on REST APIs. ',
        bullets: '1. Chillspace Labs | Built REST APIs serving 2M requests a day\n- Plain bullet without source',
        keywordsCovered: 'REST APIs, Git, REST APIs',
        keywordsMissing: '',
      },
      1,
    );
    expect(tailored.summary).toBe('Backend engineer focused on REST APIs.');
    expect(tailored.bullets).toEqual([
      { source: 'Chillspace Labs', text: 'Built REST APIs serving 2M requests a day' },
      { source: '', text: 'Plain bullet without source' },
    ]);
    expect(tailored.keywordsCovered).toEqual(['REST APIs', 'Git']);
    expect(tailored.keywordsMissing).toEqual([]);
  });
});
