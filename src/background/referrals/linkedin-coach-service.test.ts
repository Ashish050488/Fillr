import { describe, expect, it } from 'vitest';
import { toCoach } from './linkedin-coach-service';

describe('toCoach', () => {
  it('turns the AI answers into short lists, dropping numbering and extras', () => {
    const coach = toCoach(
      {
        focus: 'Engineers at the fintechs you applied to.',
        people: '1. Backend engineers at Stripe\n2) Founders of payments startups\n- Alumni from IIT\nExtra line',
        titles: 'Backend Engineer, Engineering Manager, CTO',
        keywords: 'TypeScript, payments',
        companies: 'Stripe, Razorpay, , Juspay',
        plan: 'Message 2 engineers at Stripe\nFollow up with Akash\nSearch Razorpay CTOs',
      },
      1,
    );
    expect(coach.people).toEqual(['Backend engineers at Stripe', 'Founders of payments startups', 'Alumni from IIT']);
    expect(coach.titles).toEqual(['Backend Engineer', 'Engineering Manager', 'CTO']);
    expect(coach.companies).toEqual(['Stripe', 'Razorpay', 'Juspay']);
    expect(coach.plan).toHaveLength(3);
  });
});
