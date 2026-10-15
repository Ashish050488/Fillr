import { describe, expect, it } from 'vitest';
import { extractJsonReply as strip } from '../routing/extract-json-reply';
import { humanize, taskPrompt, validateTaskResult } from './task-prompts';
import type { AnswerQuestionsContext } from '../../../shared/types';

const context: AnswerQuestionsContext = {
  candidate: { name: 'Jane Doe', skills: ['TypeScript'], experience: [{ company: 'Acme', title: 'Engineer' }] },
  jobDescription: 'Senior TypeScript engineer for payments.',
  jobTitle: 'Senior Engineer',
  company: 'Globex',
  questions: [
    { id: 'q0', label: 'Cover letter', kind: 'long' },
    { id: 'q1', label: 'How did you hear about us?', kind: 'choice', options: ['LinkedIn', 'Referral'] },
    { id: 'q2', label: 'Current title', kind: 'short', maxLength: 5 },
  ],
};

describe('answer_questions task', () => {
  it('puts the job, parsed profile, questions and style rules into one prompt', () => {
    const prompt = taskPrompt('answer_questions', { ...context, style: { length: 'short' } });
    expect(prompt).toContain('Senior TypeScript engineer for payments.');
    expect(prompt).toContain('"company":"Acme"');
    expect(prompt).toContain('"id":"q1"');
    expect(prompt).toContain('60-120 words');
    expect(prompt).toMatch(/Never use em dashes/);
  });

  it('writes a note to the founder for Y Combinator startups instead of a formal letter', () => {
    const prompt = taskPrompt('answer_questions', { ...context, audience: 'yc-founder' });
    expect(prompt).toContain('FOUNDER NOTE');
    expect(prompt).toContain('Your note goes to');
    expect(prompt).not.toContain('Dear Hiring Team,"');
    expect(taskPrompt('answer_questions', context)).not.toContain('FOUNDER NOTE');
  });

  it('writes a referral request for LinkedIn that reads their current company, not a past one', () => {
    const prompt = taskPrompt('answer_questions', { ...context, audience: 'linkedin-referral' });
    expect(prompt).toContain('MESSAGE TO A PERSON ON LINKEDIN');
    expect(prompt).toContain('CURRENT role and company');
    expect(prompt).toContain('Startup founder or CEO: do not ask for a referral');
    expect(prompt).toContain('Recruiter or talent partner');
    expect(prompt).toContain('Japan: formal, humble and very brief');
    expect(prompt).toContain('FOLLOW-UP');
    expect(prompt).not.toContain('FOUNDER NOTE');
  });

  it('keeps only asked, non-empty answers and exact choice options', () => {
    const result = validateTaskResult('answer_questions', context, {
      answers: { q0: 'Dear Globex team,', q1: 'Twitter', q2: 'Engineer', q9: 'unasked', q3: '' },
    });
    expect(result).toEqual({ answers: { q0: 'Dear Globex team,', q2: 'Engin' } });
  });

  it('extracts JSON wrapped in prose or fences', () => {
    expect(JSON.parse(strip('Sure! ```json\n{"answers":{}}\n``` hope that helps'))).toEqual({ answers: {} });
    expect(JSON.parse(strip('Here you go: {"a":1}'))).toEqual({ a: 1 });
  });
});

describe('humanize', () => {
  it('removes dashes, word slashes and markdown but keeps URLs, acronyms and hyphenated words', () => {
    expect(humanize('I built APIs — fast ones -- and tests – lots.')).toBe('I built APIs, fast ones, and tests, lots.');
    expect(humanize('I can design/build it and/or ship it.')).toBe('I can design or build it or ship it.');
    expect(humanize('See https://github.com/jane/repo and CI/CD, full-stack work.')).toBe(
      'See https://github.com/jane/repo and CI/CD, full-stack work.',
    );
    expect(humanize('**Bold** start\n- a bullet')).toBe('Bold start\na bullet');
  });
});
