import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { profileSchema, resumeFactsSchema } from '../../shared/schemas';
import { sendMessage } from '../../shared/messaging/extension-messages';
import { getStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import { emptyProfile } from '../profile/create-empty-profile';
import { ProfileSession, type ProfileSnapshot } from '../profile/profile-session';
import { readResume } from '../profile/read-resume-pdf';
import { derivedFields } from '../../shared/resume/derived-profile-fields';

type Feedback = { kind: 'error' | 'success' | 'working'; text: string };

export function useProfileController() {
  const session = useRef<ProfileSession>();
  const [snapshot, setSnapshot] = useState<ProfileSnapshot>();
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<Feedback>();
  const [busy, setBusy] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    getStorage<unknown>(STORAGE_KEYS.PROFILES, [])
      .then((stored) => {
        const profiles = z.array(profileSchema).parse(stored);
        if (!active) return;
        const current = new ProfileSession(profiles[0] ?? emptyProfile());
        session.current = current;
        setSnapshot(current.snapshot);
        unsubscribe = current.subscribe(setSnapshot);
        // Profiles parsed before education fields existed get them now, without a new parse.
        void current.backfill(derivedFields(current.snapshot.profile))?.catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load your profile.');
      });
    return () => {
      active = false;
      request.current += 1;
      unsubscribe?.();
    };
  }, []);

  const editField = (key: string, value: string) => {
    void session.current?.editField(key, value).catch(() => undefined);
  };
  const editSkills = (value: string) => {
    void session.current
      ?.editSkills(
        value
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
      )
      .catch(() => undefined);
  };

  async function upload(file: File) {
    const current = session.current;
    if (!current) return;
    const token = ++request.current;
    setBusy(true);
    setFeedback({ kind: 'working', text: 'Reading your PDF…' });
    try {
      const resume = await readResume(file);
      if (request.current !== token) return;
      // Same file restored from the sync backup: profile is already parsed, only the PDF was missing.
      const previous = current.snapshot.profile;
      const restoring = Boolean(
        previous.fields.email?.value &&
          previous.resume &&
          !previous.resume.base64 &&
          previous.resume.fileName === resume.fileName,
      );
      await current.setResume(resume);
      if (request.current !== token) return;
      if (restoring) {
        setFeedback({
          kind: 'success',
          text: 'Resume file restored. Your profile was already saved, so no re-parse was needed.',
        });
        return;
      }
      if (!resume.plainText?.trim()) {
        setFeedback({
          kind: 'error',
          text: 'No readable text was found. This may be a scanned PDF. Choose a text-based PDF instead.',
        });
        return;
      }
      setBusy(false);
      await parse();
      return;
    } catch (error) {
      if (request.current === token)
        setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Could not read your resume.' });
    } finally {
      if (request.current === token) setBusy(false);
    }
  }

  async function parse() {
    const current = session.current;
    const resume = current?.snapshot.profile.resume;
    if (!current || !resume?.plainText?.trim()) return;
    if (current.snapshot.status === 'error') {
      setFeedback({ kind: 'error', text: 'Retry saving your edits before parsing the resume.' });
      return;
    }
    const token = ++request.current;
    setBusy(true);
    setFeedback({ kind: 'working', text: 'Reading your resume… usually 10 to 30 seconds.' });
    try {
      const response = await sendMessage('AI_TASK', {
        task: 'resume_parsing',
        context: { resumeText: resume.plainText },
      });
      if (request.current !== token) return;
      if (!response.success || !response.result) throw new Error(response.error ?? 'Could not parse your resume.');
      await current.applyFacts(resumeFactsSchema.parse(response.result), resume);
      if (request.current === token)
        setFeedback({
          kind: 'success',
          text: `Profile updated and saved automatically using ${response.model ?? 'your parsing model'}. Open Profile to review or edit it.`,
        });
    } catch (error) {
      if (request.current === token)
        setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Could not parse your resume.' });
    } finally {
      if (request.current === token) setBusy(false);
    }
  }

  return {
    snapshot,
    loadError,
    feedback,
    busy,
    editField,
    editSkills,
    upload,
    parse,
    retry: () => {
      void session.current?.retry();
    },
  };
}

export type ProfileController = ReturnType<typeof useProfileController>;
