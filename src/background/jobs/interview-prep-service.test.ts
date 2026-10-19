import { describe, expect, it } from 'vitest';
import { describeFitForPrep, toInterviewPrep } from './interview-prep-service';

describe('toInterviewPrep', () => {
  it('keeps six questions, four stories and three questions to ask, without numbering', () => {
    const prep = toInterviewPrep(
      {
        questions: Array.from({ length: 8 }, (_, index) => `${index + 1}. Question ${index + 1} | checks X`).join('\n'),
        stories: '- Scaling | Rebuilt the ledger, 40M rows\n- Ownership | Ran on-call',
        askThem: 'How is on-call shared?\nWhat ships next quarter?\nHow do you measure success?\nExtra',
      },
      1,
    );
    expect(prep.questions).toHaveLength(6);
    expect(prep.questions[0]).toBe('Question 1 | checks X');
    expect(prep.stories).toEqual(['Scaling | Rebuilt the ledger, 40M rows', 'Ownership | Ran on-call']);
    expect(prep.askThem).toHaveLength(3);
  });
});

describe('describeFitForPrep', () => {
  it('passes strengths and the gaps an interviewer will push on', () => {
    const text = describeFitForPrep({
      analysis: {
        score: 70,
        verdict: 'good',
        headline: '',
        matches: [{ requirement: 'Postgres', evidence: '40M row tables' }],
        gaps: ['Kafka'],
        dealbreakers: [],
        tips: [],
        keywords: [],
      },
    });
    expect(text).toBe('Strengths: Postgres (40M row tables)\nGaps they may probe: Kafka');
    expect(describeFitForPrep({})).toBe('');
  });
});
