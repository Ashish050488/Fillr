import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileSession } from './profile-session';
import { emptyProfile } from './create-empty-profile';
import type { Profile, Resume } from '../../shared/types';

const resume: Resume = {
  fileName: 'fixture.pdf',
  fileType: 'application/pdf',
  fileSize: 8,
  uploadDate: '2026-01-01',
  base64: 'Zml4dHVyZQ==',
  plainText: 'Sample Person sample@example.com',
};
const stored = new Map<string, unknown>();
let seed: Profile;

function profiles(): Profile[] {
  return structuredClone(stored.get('jobfill_profiles')) as Profile[];
}
beforeEach(() => {
  stored.clear();
  seed = { ...emptyProfile(), id: 'profile-1', resume };
  stored.set('jobfill_profiles', [seed, { ...emptyProfile(), id: 'profile-2' }]);
  stored.set('jobfill_jobs_v1', [{ id: 'keep-job' }]);
  stored.set('jobfill_ai_config', { keys: [{ key: 'keep-secret' }] });
  stored.set('jobfill_lifetime_metrics_v1', { totalFormsFilled: 17 });
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: structuredClone(stored.get(key)) })),
        set: vi.fn(async (values: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(values)) stored.set(key, structuredClone(value));
        }),
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('automatic resume profile saving', () => {
  it('persists parsed facts without a Save click, survives reopening and preserves all other stores', async () => {
    const other = profiles()[1];
    const session = new ProfileSession(seed);
    await session.applyFacts(
      { name: { full: 'Sample Person' }, email: 'sample@example.com', skills: ['TypeScript'] },
      resume,
    );
    const reopened = new ProfileSession(profiles()[0]);
    expect(reopened.snapshot.profile.fields.name.value).toBe('Sample Person');
    expect(reopened.snapshot.profile.fields.email.value).toBe('sample@example.com');
    expect(reopened.snapshot.profile.skills).toEqual(['TypeScript']);
    expect(session.snapshot.status).toBe('saved');
    expect(profiles()[1]).toEqual(other);
    expect(stored.get('jobfill_jobs_v1')).toEqual([{ id: 'keep-job' }]);
    expect(stored.get('jobfill_ai_config')).toEqual({ keys: [{ key: 'keep-secret' }] });
    expect(stored.get('jobfill_lifetime_metrics_v1')).toEqual({ totalFormsFilled: 17 });
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
  });

  it('keeps edits made while parsing is in progress, including blank fields and skills', async () => {
    const session = new ProfileSession(seed);
    await session.editField('name', 'My correction');
    await session.editField('phone', '');
    await session.editSkills([]);
    await session.applyFacts(
      { name: { full: 'AI name' }, phone: '999', skills: ['AI skill'], github: 'https://github.com/fixture' },
      resume,
    );
    const profile = profiles()[0];
    expect(profile.fields.name.value).toBe('My correction');
    expect(profile.fields.phone).toMatchObject({ value: '', source: 'manual' });
    expect(profile.skills).toEqual([]);
    expect(profile.manualLists?.skills).toBe(true);
    expect(profile.fields.github.value).toBe('https://github.com/fixture');
  });

  it('merges with the latest stored profile rather than an old UI snapshot', async () => {
    const session = new ProfileSession(seed);
    const current = profiles();
    current[0].fields.email = { value: 'edited-elsewhere@example.com', source: 'manual' };
    stored.set('jobfill_profiles', current);
    await session.applyFacts({ email: 'old@example.com', country: 'India' }, resume);
    expect(session.snapshot.profile.fields.email.value).toBe('edited-elsewhere@example.com');
    expect(profiles()[0].fields.country.value).toBe('India');
  });

  it('serializes rapid edits and parser completion without reverting later corrections', async () => {
    const session = new ProfileSession(seed);
    const first = session.editField('name', 'A');
    const parsed = session.applyFacts({ name: { full: 'AI name' }, email: 'sample@example.com' }, resume);
    const last = session.editField('name', 'Final name');
    await Promise.all([first, parsed, last]);
    expect(profiles()[0].fields.name.value).toBe('Final name');
    expect(session.snapshot.profile.fields.name.value).toBe('Final name');
    expect(profiles()[0].fields.email.value).toBe('sample@example.com');
  });

  it('reports storage failures without claiming saved, and retries retained changes', async () => {
    const session = new ProfileSession(seed);
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(session.applyFacts({ name: { full: 'Sample Person' } }, resume)).rejects.toThrow(
      'Storage unavailable',
    );
    expect(session.snapshot.status).toBe('error');
    expect(profiles()[0].fields.name).toBeUndefined();
    await session.retry();
    expect(session.snapshot.status).toBe('saved');
    expect(profiles()[0].fields.name.value).toBe('Sample Person');
  });

  it('does not merge a completed response for a replaced resume', async () => {
    const session = new ProfileSession(seed);
    await session.setResume({ ...resume, plainText: 'A newer resume', uploadDate: '2026-01-02' });
    await expect(session.applyFacts({ name: { full: 'Old resume name' } }, resume)).rejects.toThrow('resume changed');
    expect(profiles()[0].fields.name).toBeUndefined();
  });
});
