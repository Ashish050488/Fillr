/**
 * Y Combinator and Wellfound applications go straight to a founder, who reads every note in a few seconds.
 * A generic cover letter gets skipped; a short, specific note from someone who clearly read
 * about the company and has shipped similar things gets a reply. These rules write that note.
 */
export const FOUNDER_NOTE_RULES = [
  'FOUNDER NOTE (a startup on Y Combinator or Wellfound: the cover letter and any "message", "note", "what interests you" or "why us" question go straight to a founder or hiring contact)',
  '- Write to one person by first name ("Hi Jay,"): whoever "Your note goes to" names, or the person the question names ("Write a note to Sam"), or the hiring contact on the page, else the first founder. If no person is named anywhere, use "Hi <company name> team,". Never "Dear Hiring Team", "To whom it may concern" or "Dear Sir".',
  "- 90-160 words in 2 or 3 short paragraphs, and always within the question's maxLength if it has one. Founders skim; every sentence must earn its place.",
  '- If the question asks something specific (e.g. "What interests you about this company?"), answer exactly that in this voice instead of writing a generic letter.',
  '- Opening line: one specific, true observation about what they are building or the problem they describe (use a concrete detail from the company or job text, not the one-liner reworded) and why it connects to something you have actually done. No compliments like "love your mission" or "impressive team".',
  '- Middle: the one or two strongest proofs from your profile that match the hardest part of this role. Something you built or shipped, what it did, and a real number if the profile has one. Show ownership and speed: you built it end to end, you shipped it, people used it.',
  '- Common ground: if a founder bio and your profile share something real and exact (same university, same previous company, same niche domain), mention it in half a sentence. Only if it is literally in both texts; never stretch it.',
  '- If the posting lists a requirement you do not meet, do not apologise or mention it. If it names something you clearly do have (a stack, a domain, new grads welcome), say it plainly.',
  '- Close with one easy next step, e.g. "Happy to walk you through how I built X." If the profile has a GitHub or portfolio link, add it on its own line. Sign off with just your first name.',
  '- Never use: "I came across", "I am excited", "I am writing to", "I believe I would be a great fit", "fast-paced", "hit the ground running", "wear many hats", "rockstar", "ninja", "game-changer", "disrupt". Never repeat the job title back at them as a sentence.',
  'FOUNDER QUESTIONS (YC and Wellfound ask personal questions instead of form fields, e.g. "What\'s the hardest system you\'ve built and shipped?", "When have you taken initiative and owned an outcome?", "How would you approach automating a complex customer workflow?")',
  '- A box like "Reach out to Akash at Zudo" or "Start a conversation with the team" is the founder note above, written to that person.',
  '- Answer each question with one real story from the profile: the situation in one sentence, what you personally did (decisions, trade-offs, what broke and how you fixed it), and the result with a real number if there is one. 60-120 words unless the question asks otherwise.',
  '- Start with the answer itself. Never restate the question ("The most challenging system I built was...", "I approach complex workflows by..."). Lead with the thing, e.g. "A billing ledger that had to reconcile every night without double counting." Style example only; use the profile\'s real facts.',
  '- Use a different project or job for each question wherever the profile has enough material. Never use the same project as the main story in more than one answer, and never mention the same metric twice across answers.',
  '- "How would you approach..." questions: give 2 or 3 concrete steps you would take for their product (use what the company does), each tied to where you have done that step before. No generic frameworks.',
  '- Sound like a person typing to a founder: short sentences, "I", no corporate summary sentences at the end like "This experience taught me the value of...".',
  '- Before answering, check the draft silently: it names the company and one detail only this company has; every claim is in the profile; it would not make sense sent to a different startup. Rewrite until it passes, then output only the final note.',
];
