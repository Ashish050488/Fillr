/** Every message between the side panel, page scripts and background, with its request and reply. */
import type { AIProvider, AITask, AITaskContext, AITaskResult, AnswerStyle, FormQuestion } from './ai';
import type { Job, JobStatus, PageScan } from './job';
import type { Resume } from './profile';
import type { ProfileBoost, ProfilePageScan } from './profile-boost';
import type {
  LinkedInCoach,
  LinkedInProfileSnapshot,
  OutreachGoal,
  Referral,
  ReferralChannel,
  ReferralDrafts,
  ReferralStatus,
} from './referral';

export interface MessageMap {
  GET_STATUS: { request: undefined; response: { status: 'ready'; version: string } };
  PING: { request: undefined; response: { status: 'pong'; url: string } };
  RELOAD_EXTENSION: { request: undefined; response: { success: true } };
  RECORD_FORM_FILL: {
    request: { site: string; url: string; jobTitle?: string; company?: string; atsUrl?: string; fieldsFilled: number };
    response: { success: boolean; jobId?: string; error?: string };
  };
  MARK_JOB_APPLIED: {
    request: {
      jobId?: string;
      site?: string;
      url?: string;
      jobTitle?: string;
      company?: string;
      atsUrl?: string;
      /** Sent from an embedded form: use the tab's URL. */ frame?: boolean;
      auto?: boolean;
    };
    response: { success: boolean; jobTitle?: string; error?: string };
  };
  AI_USAGE: {
    request: undefined;
    response: { success: boolean; rows: Array<{ model: string; used: number; limit: number; exhausted: boolean }> };
  };
  JOB_REPAIR: { request: undefined; response: { success: boolean; fixed: number } };
  FILL_FORM: {
    request: { ai?: boolean; force?: boolean } | undefined;
    response: {
      success: boolean;
      filledCount?: number;
      aiCount?: number;
      totalCount?: number;
      message?: string;
      aiError?: string;
      held?: boolean;
      score?: number;
    };
  };
  DETECT_FORM: { request: undefined; response: { found: boolean; inputCount: number } };
  GET_FILL_PROFILE: {
    request: undefined;
    response: {
      success: boolean;
      fields: Record<string, { value: string }>;
      resume?: Resume;
      history?: {
        experience: Array<Record<string, unknown>>;
        education: Array<Record<string, unknown>>;
        links: string[];
        skills?: string[];
      };
      error?: string;
    };
  };
  AI_TEST_KEY: {
    request: { provider?: AIProvider; key?: string; id?: string };
    response: { success: boolean; models?: string[]; error?: string };
  };
  AI_KEY_INFO: {
    request: undefined;
    response: {
      success: boolean;
      keys: Array<{ id: string; provider: AIProvider; masked: string; enabled: boolean }>;
      error?: string;
    };
  };
  AI_SAVE_KEY: {
    request: { provider: AIProvider; key: string };
    response: { success: boolean; id?: string; masked?: string; error?: string };
  };
  AI_REMOVE_KEY: { request: { id: string }; response: { success: boolean; error?: string } };
  AI_LOAD_MODELS: {
    request?: undefined;
    response: { success: boolean; models: Partial<Record<AIProvider, string[]>>; error?: string };
  };
  AI_TASK: {
    request: { task: AITask; context?: AITaskContext; model?: string };
    response: { success: boolean; result?: AITaskResult; provider?: AIProvider; model?: string; error?: string };
  };
  SCAN_PAGE: { request: undefined; response: { success: boolean; scan?: PageScan; error?: string } };
  FILL_PROGRESS: { request: { text: string; url: string }; response: { success: boolean } };
  JOB_GET: { request: { url: string }; response: { success: boolean; job?: Job; error?: string } };
  JOB_PREPARE: {
    request: { scan: PageScan; force?: boolean; refresh?: boolean; analyzeOnly?: boolean };
    response: { success: boolean; job?: Job; answers?: Record<string, string>; held?: boolean; error?: string };
  };
  JOB_COVER_LETTER: {
    request: { key: string; style?: AnswerStyle };
    response: { success: boolean; job?: Job; error?: string };
  };
  JOB_UPDATE: {
    request: { key: string; patch: { coverLetter?: string; status?: JobStatus; notes?: string } };
    response: { success: boolean; job?: Job; error?: string };
  };
  JOB_DELETE: { request: { key: string }; response: { success: boolean; error?: string } };
  JOB_INTERVIEW_PREP: { request: { key: string }; response: { success: boolean; job?: Job; error?: string } };
  JOB_TAILOR_RESUME: { request: { key: string }; response: { success: boolean; job?: Job; error?: string } };
  FRAMES_SCAN: { request: undefined; response: { success: boolean; questions: FormQuestion[] } };
  FILL_FRAMES: {
    request: { context: { url: string; pageText: string; jobTitle?: string; company?: string }; force?: boolean };
    response: { success: boolean; filled?: number; ai?: number; total?: number; held?: boolean };
  };
  ANSWERS_LOOKUP: {
    request: { keys: string[] };
    response: { success: boolean; answers: Record<string, string>; error?: string };
  };
  ANSWER_REMEMBER: {
    request: { entries: Array<{ key: string; label: string; answer: string }> };
    response: { success: boolean; error?: string };
  };
  ANSWERS_LIST: {
    request: undefined;
    response: {
      success: boolean;
      answers: Record<string, { answer: string; label: string; savedAt: number }>;
      error?: string;
    };
  };
  ANSWER_FORGET: { request: { key: string }; response: { success: boolean; error?: string } };
  OPEN_PANEL: { request: undefined; response: { success: boolean; error?: string } };
  REFERRAL_DRAFT: {
    request: { snapshot: LinkedInProfileSnapshot; jobUrl?: string; goal?: OutreachGoal };
    response: {
      success: boolean;
      drafts?: ReferralDrafts;
      referral?: Referral;
      /** Things to know before sending, e.g. you already asked this person. */
      notices?: string[];
      error?: string;
    };
  };
  REFERRAL_MARK_ASKED: {
    request: { profileUrl: string; channel: ReferralChannel; message?: string };
    response: { success: boolean; referral?: Referral; error?: string };
  };
  REFERRAL_UPDATE: {
    request: { id: string; status: ReferralStatus };
    response: { success: boolean; error?: string };
  };
  REFERRAL_DELETE: { request: { id: string }; response: { success: boolean; error?: string } };
  LINKEDIN_COACH: {
    request: { refresh?: boolean } | undefined;
    response: { success: boolean; coach?: LinkedInCoach; error?: string };
  };
  PROFILE_PAGE_SCAN: { request: undefined; response: { success: boolean; scan?: ProfilePageScan; error?: string } };
  PROFILE_PAGE_WRITE: {
    request: { fieldId: string; value: string; maxLength?: number };
    response: { success: boolean; error?: string };
  };
  PROFILE_PAGE_ADD_SKILLS: {
    request: { skills: string[] };
    response: { success: boolean; added: string[]; error?: string };
  };
  /** cachedOnly: return the saved rewrite for this page, or nothing, without calling AI. */
  PROFILE_BOOST: {
    request: { scan: ProfilePageScan; refresh?: boolean; cachedOnly?: boolean };
    response: { success: boolean; boost?: ProfileBoost; error?: string };
  };
  CONTENT_MESSAGE: {
    request: { type: string; payload?: unknown };
    response: { success: boolean; data?: unknown; error?: string };
  };
}
export type MessageAction = keyof MessageMap;
