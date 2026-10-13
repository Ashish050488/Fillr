export type MessageMap = {
  GET_STATUS: { request: undefined; response: { status: 'ready'; version: string } };
  ASK_AI: { request: { task: string; system?: string; prompt: string; json?: boolean }; response: { success: boolean; text?: string; error?: string } };
  TEST_SINGLE_KEY: { request: { provider: string; key: string; model?: string }; response: { valid: boolean; message?: string; error?: string } };
  FETCH_MODELS: { request: { provider: string; key?: string; freeOnly?: boolean }; response: { success: boolean; models?: string[]; error?: string } };
  RECORD_FORM_FILL: { request: { site: string; url: string; jobTitle?: string; company?: string; fieldsFilled: number }; response: { success: boolean; jobId?: string } };
  MARK_JOB_APPLIED: { request: { jobId?: string; site?: string; url?: string; jobTitle?: string; company?: string }; response: { success: boolean } };
  LOG_APPLICATION_EVENT: { request: { site: string; jobTitle?: string; company?: string; fieldsFilled?: number; type: string }; response: { success: boolean } };
  PING: { request: undefined; response: { status: 'pong'; url: string } };
  DETECT_FORM: { request: undefined; response: { found: boolean; inputCount: number } };
  FILL_FORM: { request: undefined; response: { success: boolean; filledCount?: number; totalCount?: number; message?: string } };
  TRIGGER_TAILOR: { request: undefined; response: { success: boolean; message?: string } };
  TRIGGER_TAILOR_LAST_CLICKED: { request: undefined; response: { success: boolean; message?: string } };
};

export type MessageAction = keyof MessageMap;
