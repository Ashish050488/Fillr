/** Referral requests you send on LinkedIn: who you asked, at which company, and what came of it. */
export type ReferralStatus = 'drafted' | 'asked' | 'replied' | 'referred' | 'declined';
export type ReferralChannel = 'message' | 'invitation' | 'email';
/** What you want from this person; "auto" lets JobFill choose from who they are. */
export type OutreachGoal = 'auto' | 'referral' | 'job' | 'advice' | 'followup';

export interface Referral {
  /** The profile address without query or trailing parts, e.g. linkedin.com/in/akash-rao. */
  id: string;
  profileUrl: string;
  personName: string;
  personRole?: string;
  company?: string;
  /** The job you asked about, when you gave one. */
  jobUrl?: string;
  status: ReferralStatus;
  channel?: ReferralChannel;
  draftedAt: number;
  askedAt?: number;
  /** Follow-ups sent after the first message, and when you last wrote. */
  followUpCount?: number;
  lastContactAt?: number;
  /** Who they are to you, e.g. "Startup founder or CEO", as JobFill read it. */
  persona?: string;
  /** The message as last written, so you can see what you sent. */
  message?: string;
}

/** What JobFill read on the profile you have open (and its recent posts, if you opened them). */
export interface LinkedInProfileSnapshot {
  profileUrl: string;
  personName: string;
  /** Visible text of the profile: headline, about, experience. */
  profileText: string;
  /** Visible text of their recent posts, when you opened their activity page. */
  postsText?: string;
}

/** Today's LinkedIn suggestions: who to reach out to and searches to find them. */
export interface LinkedInCoach {
  focus: string;
  people: string[];
  titles: string[];
  keywords: string[];
  companies: string[];
  plan: string[];
  createdAt: number;
}

export interface ReferralDrafts {
  /** For a LinkedIn message to a connection. */
  message: string;
  /** For a connection request note: 200 characters at most, no link. */
  invitationNote: string;
  emailSubject: string;
  emailBody: string;
  /** Who JobFill thinks they are and the match it used, shown so you can check before sending. */
  persona?: string;
  angle?: string;
}
