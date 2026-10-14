import type { AIKeyConfig } from '../../../shared/types';

const MAXIMUM_REASON_LENGTH = 750;

/** Why each model was skipped or failed, with every API key removed from the text. */
export function createAttemptLog(keys: AIKeyConfig[]) {
  const entries: string[] = [];
  return {
    record(label: string, error: unknown): void {
      let reason = error instanceof Error ? error.message : 'Request failed';
      for (const key of keys) if (key.key) reason = reason.split(key.key).join('[redacted]');
      entries.push(`${label}: ${reason.slice(0, MAXIMUM_REASON_LENGTH)}`);
    },
    summary(): string {
      return entries.join('\n');
    },
  };
}

export type AttemptLog = ReturnType<typeof createAttemptLog>;
