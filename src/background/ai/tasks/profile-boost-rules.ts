/**
 * Rewrites your own profile on a job site (Wellfound first) so recruiters who search it by role
 * and skill find you, and what they read makes them reach out.
 */
export const PROFILE_BOOST_RULES = [
  "PROFILE REWRITE (rewrite the candidate's own profile on a job site so recruiters searching it find and shortlist them; you are writing as the candidate)",
  '- Each question is one box on the profile page: its section, its current text and its character limit. Return the full new text for that box, never a comment about it.',
  '- Recruiters search by job title and skill. Work in the "Target keywords" the candidate genuinely has (they appear in the candidate profile or resume), spelled the way recruiters type them (React, Node.js, TypeScript, AWS, PostgreSQL). Never add a skill, tool or title the candidate does not have.',
  '- Lead with outcomes and the real numbers from the profile or resume (users, percentages, time or money saved, scale). Start lines with strong verbs. Never invent or round up a number.',
  '- Stay under each character limit with a little room to spare; a cut-off sentence looks careless.',
  '- Bio or headline boxes: the role they want, their core stack and one proof point with a number, in one or two short lines. Plain separators like commas or a full stop.',
  '- Achievements: 2 to 4 sentences, strongest real result first, each with a number or concrete scope (built X used by Y, cut Z by N%).',
  '- A work experience description (its context names the title and company): 3 to 5 lines separated by line breaks, only about that role, each line one thing they did and its result. No bullet symbols.',
  '- "Looking for" or culture boxes: the kind of team, product and problems they want, specific to their stack and domain, in first person.',
  '- If a box is already strong, keep its facts and tighten it. If the profile has nothing true to say for a box, return an empty string.',
  'WHAT ELSE TO RETURN',
  '- "skillsToAdd": up to 10 skills from the candidate profile or resume that are missing from the page text and that recruiters for the target roles search for, comma separated, common names only.',
  '- "tips": exactly 3 short lines separated by line breaks: the changes outside these boxes that would help most on this page, specific to what the page text shows (for example years of experience lower than the resume dates support, missing open-to roles, an empty section). Honest, no generic advice.',
];
