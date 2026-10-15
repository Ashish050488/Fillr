/**
 * Messages to people on LinkedIn, written for who they are. A founder wants proof you can
 * build what they are building; a CTO wants to see you understand their technical work; a
 * recruiter wants the role, one qualifying match and your availability; an engineer at a big
 * company is the referral route and needs the job link and an easy yes.
 */
export const RECIPIENT_PERSONAS = [
  'Startup founder or CEO',
  'Startup CTO or engineering leader',
  'Engineering manager or hiring manager',
  'Recruiter or talent partner',
  'Engineer or peer at the company',
  'Other',
] as const;

export const REFERRAL_MESSAGE_RULES = [
  'MESSAGE TO A PERSON ON LINKEDIN (you write it, the candidate sends it)',
  'STEP 1, READ THEM. From "Their LinkedIn profile" and posts work out: their CURRENT role and company (the job with no end date or "Present", never a past one), whether the company is a startup (founder titles, small team, seed or Series A, YC) or a large company, and what THEY work on (product, team, stack, topics they post about).',
  'STEP 2, PICK THE ANGLE. Find the single item in your profile closest to their work: same problem, domain, stack or kind of user. Name both sides concretely ("you are building X; I built Y that does Z"). If nothing truly matches, use your strongest shipped project and say plainly why it transfers. Only use common ground that is literally in both texts (same university, past company, city).',
  'STEP 3, WRITE FOR WHO THEY ARE ("persona"):',
  '- Startup founder or CEO: do not ask for a referral, they are the decision maker. Show proof of work tied to their product, plus one concrete thing you would build or improve for them in your first weeks (grounded in what their company does). Ask directly if they would talk about joining. Never pitch generic skills.',
  '- Startup CTO or engineering leader: be technical. Reference their actual system, stack or a post, and your closest technical build with the real number. Ask for a short chat about the engineering team or the role.',
  "- Engineering manager or hiring manager (larger company): about their team's work and the role, not your job search. One or two proofs that fit their team. Ask if they would consider you for the role or point you to the right opening.",
  '- Recruiter or talent partner: short and practical. Your current role, the exact opening (job link if given), one or two qualifying matches, and your location, notice period or start date if the profile has them. Ask to be considered.',
  '- Engineer or peer at the company: this is the referral ask. Name the exact role (link below if given), 2 or 3 lines on fit, and make yes easy: offer to send a short summary they can forward. Thank them.',
  '- Other: ask for 15 minutes of their advice about their company or field.',
  '- If "What you want" says something specific (referral, a job at their company, advice), follow it, adapting the wording to the persona.',
  'COUNTRY AND CULTURE (from their location on the profile; always write in English so the candidate knows what they send)',
  '- Japan: formal, humble and very brief. "Hello <full name>," no casual phrases, thank them for their time, a gentle ask with no pressure on timing.',
  '- Germany, Austria, Switzerland, Netherlands, Nordics: direct and factual, no small talk or enthusiasm, facts and numbers first. First names are fine at startups; "Hello <full name>," at large companies.',
  '- France, Italy, Spain, Latin America: polite and warm, a short courteous opening line about their work is welcome.',
  '- United States, Canada, UK, Australia, Singapore, India, elsewhere: friendly and direct, first name, get to the point.',
  'FOLLOW-UP (when "What you want" is a follow-up and "Your earlier message" is given)',
  '- 2 to 4 sentences. Do not repeat the first message or guilt them ("just bumping this", "did you see my message"). Add one new thing: a recent result, a relevant project, or a thought on their recent post. Restate the ask in one short line, easy to ignore. The invitation and email follow the same idea.',
  'ALWAYS',
  '- Greet by first name. The first sentence is about THEM: a specific, true detail from their posts or work. Never fake it: if they have no posts, use their product or team. Never "I came across your profile", "I hope you are well", flattery or buzzwords.',
  '- One ask only, easy to decline ("No worries if the timing is off"). Never invent anything about them or you. No em dashes or emojis.',
  'WHAT TO RETURN (one answer per question id)',
  '- "persona": exactly one of the options. "angle": one line, under 140 characters: their work → your matching work.',
  '- "message": LinkedIn message, 60-110 words, 2 or 3 short paragraphs, ending with your first name. No links; JobFill adds them.',
  '- "invitation": connection note, at most 190 characters, no links, one line: greeting, the specific detail, the ask.',
  '- "subject": email subject under 60 characters, specific to them. "email": the same message as an email, 80-140 words, ending with your full name.',
  '- "company": their current company only. "personRole": their current title only. Empty string if unclear.',
];
