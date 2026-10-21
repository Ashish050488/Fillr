/**
 * Who a founder note is for, read from the words around the message box ("Reach out to Akash at
 * Zudo", "Write a note to Sam", "Your note goes to: Jay Chia"), and a greeting that uses that name.
 */
const RECIPIENT_PATTERNS = [
  /\b(?:reach out to|write a note to|send a note to|write to|message|say hi to|introduce yourself to|note to|your note goes to:?)\s+([a-zA-Z][a-zA-Z'’-]{1,30})\b/gi,
];
const NOT_A_NAME = new Set([
  'The',
  'Team',
  'Us',
  'Our',
  'Your',
  'This',
  'Their',
  'Hiring',
  'Founder',
  'Founders',
  'Recruiter',
]);

/** The first name of the person a note is addressed to, if the text names one. */
export function findRecipientName(surroundingText: string): string | undefined {
  for (const pattern of RECIPIENT_PATTERNS) {
    for (const recipientMatch of surroundingText.matchAll(pattern)) {
      const firstName = recipientMatch[1];
      // Names are capitalised; "reach out to the team" is not a person.
      if (/^[A-Z]/.test(firstName) && !NOT_A_NAME.has(firstName)) return firstName;
    }
  }
  return undefined;
}

// "Reach out to Vedant at Salus" or "Start a conversation with the team at Salus."
const COMPANY_PATTERN =
  /\b(?:[Rr]each out to [A-Za-z'’-]+|[Tt]he team|[Tt]he founders?) at ([A-Z0-9][\w&'’ .-]{0,40}?)(?=[.,!\n]|$)/m;

/** The company an apply popup names, when the page address does not identify the job. */
export function findCompanyName(popupText: string): string | undefined {
  // Wellfound's job panel heads its form "Apply to Taskwiser".
  const applyHeading = popupText.match(/^\s*Apply to ([A-Z0-9][^\n]{0,40}?)\s*$/m)?.[1];
  return popupText.match(COMPANY_PATTERN)?.[1]?.trim() || applyHeading?.trim() || undefined;
}

const OPENING_GREETING = /^\s*(?:hi|hey|hello|dear)\b[^,\n]{0,60},?[ \t]*\n?/i;

/** "Hi Zudo team," or "Hello there," becomes "Hi Akash,"; a note with no greeting gets one. */
export function greetByName(note: string, firstName: string | undefined): string {
  if (!firstName || !note.trim()) return note;
  const greeting = `Hi ${firstName},`;
  if (OPENING_GREETING.test(note))
    return note.replace(OPENING_GREETING, `${greeting}\n`).replace(/^(Hi [^,]+,)\n(?!\n)/, '$1\n\n');
  return `${greeting}\n\n${note.trimStart()}`;
}
