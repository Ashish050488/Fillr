import { resumeFactsSchema } from '../../shared/schemas';
import type { Profile, Resume, ResumeFacts } from '../../shared/types';
import { mergeResumeFacts } from './merge-resume-facts';
import { persistProfileChange, type ProfileChange } from './profile-store';

export interface ProfileSnapshot {
  profile: Profile;
  status: 'idle' | 'saving' | 'saved' | 'error';
  error: string;
}
interface PendingChange {
  change: ProfileChange;
  resolve: (profile: Profile) => void;
  reject: (error: unknown) => void;
}

function sameResume(left: Resume | undefined, right: Resume): boolean {
  return Boolean(
    left &&
      left.fileName === right.fileName &&
      left.fileSize === right.fileSize &&
      left.fileType === right.fileType &&
      left.uploadDate === right.uploadDate &&
      left.base64 === right.base64 &&
      left.plainText === right.plainText,
  );
}

/** Keeps edits ordered, including edits made while a provider is still parsing. */
export class ProfileSession {
  private state: ProfileSnapshot;
  private pending: PendingChange[] = [];
  private running = false;
  private listeners = new Set<(snapshot: ProfileSnapshot) => void>();

  constructor(profile: Profile) {
    this.state = { profile, status: 'idle', error: '' };
  }

  get snapshot(): ProfileSnapshot {
    return this.state;
  }

  subscribe(listener: (snapshot: ProfileSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(state: ProfileSnapshot): void {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  editField(key: string, value: string): Promise<Profile> {
    return this.enqueue((profile) => ({
      ...profile,
      fields: { ...profile.fields, [key]: { value, source: 'manual', confirmed: true } },
    }));
  }

  /** Fill blank fields from the resume. Your own edits, including deliberate blanks, are kept. */
  backfill(values: Record<string, string>): Promise<Profile> | undefined {
    const missing = Object.entries(values).filter(
      ([key, value]) =>
        value && !this.state.profile.fields[key]?.value?.trim() && this.state.profile.fields[key]?.source !== 'manual',
    );
    if (!missing.length) return undefined;
    return this.enqueue((profile) => ({
      ...profile,
      fields: {
        ...profile.fields,
        ...Object.fromEntries(
          missing
            .filter(([key]) => !profile.fields[key]?.value?.trim() && profile.fields[key]?.source !== 'manual')
            .map(([key, value]) => [key, { value, source: 'ai' as const, confirmed: false }]),
        ),
      },
    }));
  }

  editSkills(skills: string[]): Promise<Profile> {
    return this.enqueue((profile) => ({
      ...profile,
      skills,
      manualLists: { ...profile.manualLists, skills: true },
    }));
  }

  setResume(resume: Resume): Promise<Profile> {
    return this.enqueue((profile) => ({ ...profile, resume }));
  }

  applyFacts(facts: ResumeFacts, expectedResume: Resume): Promise<Profile> {
    const valid = resumeFactsSchema.parse(facts);
    if (!sameResume(this.state.profile.resume, expectedResume)) {
      return Promise.reject(new Error('The resume changed during parsing. Parse the current resume instead.'));
    }
    return this.enqueue((profile) => {
      if (!sameResume(profile.resume, expectedResume)) {
        // Do not merge a response for an older resume into a newer upload.
        return profile;
      }
      return mergeResumeFacts(profile, valid);
    }).then((saved) => {
      if (!sameResume(saved.resume, expectedResume))
        throw new Error('The saved resume changed during parsing. Parse it again.');
      return saved;
    });
  }

  private enqueue(change: ProfileChange): Promise<Profile> {
    const promise = new Promise<Profile>((resolve, reject) => {
      this.pending.push({ change, resolve, reject });
    });
    this.notify({ profile: change(this.state.profile), status: 'saving', error: '' });
    void this.flush();
    return promise;
  }

  async retry(): Promise<void> {
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.running || !this.pending.length) return;
    this.running = true;
    this.notify({ ...this.state, status: 'saving', error: '' });
    try {
      while (this.pending.length) {
        const operation = this.pending[0];
        try {
          const saved = await persistProfileChange(this.state.profile, operation.change);
          this.pending.shift();
          const current = this.pending.reduce((profile, item) => item.change(profile), saved);
          this.notify({ profile: current, status: this.pending.length ? 'saving' : 'saved', error: '' });
          operation.resolve(saved);
        } catch (error) {
          this.notify({
            ...this.state,
            status: 'error',
            error: error instanceof Error ? error.message : 'Could not save your profile.',
          });
          // Keep the failed change for Retry, but never report it as saved.
          this.pending.forEach((waiter) => waiter.reject(error));
          break;
        }
      }
    } finally {
      this.running = false;
    }
  }
}
