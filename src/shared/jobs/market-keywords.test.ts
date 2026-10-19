import { describe, expect, it } from 'vitest';
import type { Job } from '../types';
import { isKeywordInText, keywordKey, marketKeywords, targetRoles } from './market-keywords';

const makeJob = (title: string, skills: string[], keywords: string[] = []): Job =>
  ({
    id: title,
    url: `https://example.com/${encodeURIComponent(title)}`,
    date: '',
    timestamp: 0,
    status: 'saved',
    fieldsFilled: 0,
    jobTitle: title,
    jobFacts: { title, skills },
    analysis: keywords.length
      ? { score: 70, verdict: 'good', headline: '', matches: [], gaps: [], dealbreakers: [], tips: [], keywords }
      : undefined,
  }) as Job;

describe('keywordKey', () => {
  it('treats React.js, ReactJS and react as one term', () => {
    expect(keywordKey('React.js')).toBe(keywordKey('react'));
    expect(keywordKey('ReactJS')).toBe(keywordKey('React'));
    expect(keywordKey('CI/CD')).toBe(' ci cd ');
  });
});

describe('isKeywordInText', () => {
  const text = 'Full-Stack Engineer | MERN, AWS, Docker. Node.js and React.js, CI/CD';
  it('finds whole words whatever the spelling', () => {
    expect(isKeywordInText('Node.js', text)).toBe(true);
    expect(isKeywordInText('react', text)).toBe(true);
    expect(isKeywordInText('CI/CD', text)).toBe(true);
  });
  it('does not match inside other words', () => {
    expect(isKeywordInText('Go', 'Google Docker')).toBe(false);
    expect(isKeywordInText('TypeScript', text)).toBe(false);
  });
});

describe('marketKeywords', () => {
  it('ranks terms by how many postings ask for them, counting a job once', () => {
    const jobs = [
      makeJob('Backend Engineer', ['Node.js', 'AWS', 'node.js'], ['AWS']),
      makeJob('Full Stack Engineer', ['React', 'Node.js', 'TypeScript']),
      makeJob('Frontend Engineer', ['React', 'Node.js']),
    ];
    expect(marketKeywords(jobs).slice(0, 2)).toEqual(['Node.js', 'React']);
    expect(marketKeywords(jobs)).toContain('AWS');
    expect(marketKeywords(jobs, 1)).toHaveLength(1);
  });
});

describe('targetRoles', () => {
  it('drops levels and extras so the same role counts together', () => {
    const jobs = [
      makeJob('Senior Backend Engineer', []),
      makeJob('Backend Engineer (Remote)', []),
      makeJob('Frontend Engineer, Growth', []),
    ];
    expect(targetRoles(jobs)).toEqual(['Backend Engineer', 'Frontend Engineer']);
  });
});
