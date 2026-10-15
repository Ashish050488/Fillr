import { z } from 'zod';
import { getStorage, setStorage, STORAGE_KEYS } from '../../shared/storage/extension-storage';
import type { Referral, ReferralChannel, ReferralStatus } from '../../shared/types';

const MAXIMUM_REFERRALS = 500;
const MAXIMUM_MESSAGE_LENGTH = 3000;

const referralSchema = z.object({
  id: z.string().min(1),
  profileUrl: z.string(),
  personName: z.string(),
  personRole: z.string().optional(),
  company: z.string().optional(),
  jobUrl: z.string().optional(),
  status: z.enum(['drafted', 'asked', 'replied', 'referred', 'declined']),
  channel: z.enum(['message', 'invitation', 'email']).optional(),
  draftedAt: z.number().finite(),
  askedAt: z.number().finite().optional(),
  persona: z.string().optional(),
  followUpCount: z.number().int().optional(),
  lastContactAt: z.number().finite().optional(),
  message: z.string().optional(),
});

let pendingWrites: Promise<unknown> = Promise.resolve();

export async function readReferrals(): Promise<Referral[]> {
  const parsed = z.array(referralSchema).safeParse(await getStorage<unknown>(STORAGE_KEYS.REFERRALS, []));
  return parsed.success ? parsed.data : [];
}

/** Changes run one after another, so two tabs drafting at once never overwrite each other. */
function writeInOrder<Result>(change: (referrals: Referral[]) => Result): Promise<Result> {
  const write = pendingWrites.then(async () => {
    const referrals = await readReferrals();
    const result = change(referrals);
    const newestFirst = referrals.sort((first, second) => second.draftedAt - first.draftedAt);
    await setStorage({ [STORAGE_KEYS.REFERRALS]: newestFirst.slice(0, MAXIMUM_REFERRALS) });
    return result;
  });
  pendingWrites = write.catch(() => undefined);
  return write;
}

/** A fresh draft for this person. Someone you already asked keeps their status and date. */
export function saveReferralDraft(draft: Omit<Referral, 'status' | 'draftedAt'>): Promise<Referral> {
  return writeInOrder((referrals) => {
    const existing = referrals.find((referral) => referral.id === draft.id);
    const message = draft.message?.slice(0, MAXIMUM_MESSAGE_LENGTH);
    if (existing) {
      Object.assign(existing, {
        ...draft,
        message: message ?? existing.message,
        company: draft.company || existing.company,
      });
      return { ...existing };
    }
    const referral: Referral = { ...draft, message, status: 'drafted', draftedAt: Date.now() };
    referrals.push(referral);
    return referral;
  });
}

/** You pressed Send on LinkedIn (or chose "I sent it"): this counts as a referral ask. */
export function markReferralAsked(
  id: string,
  channel: ReferralChannel,
  message?: string,
): Promise<Referral | undefined> {
  return writeInOrder((referrals) => {
    const referral = referrals.find((candidate) => candidate.id === id);
    if (!referral) return undefined;
    if (referral.status === 'drafted') {
      referral.status = 'asked';
      referral.askedAt = Date.now();
    } else if (referral.status === 'asked') {
      // Sent again to someone you already asked: a follow-up, not a new ask.
      referral.followUpCount = (referral.followUpCount ?? 0) + 1;
    }
    referral.lastContactAt = Date.now();
    referral.channel = channel;
    if (message?.trim()) referral.message = message.trim().slice(0, MAXIMUM_MESSAGE_LENGTH);
    return { ...referral };
  });
}

export function setReferralStatus(id: string, status: ReferralStatus): Promise<boolean> {
  return writeInOrder((referrals) => {
    const referral = referrals.find((candidate) => candidate.id === id);
    if (!referral) return false;
    referral.status = status;
    if (status !== 'drafted') referral.askedAt ??= Date.now();
    return true;
  });
}

export function deleteReferral(id: string): Promise<void> {
  return writeInOrder((referrals) => {
    const index = referrals.findIndex((referral) => referral.id === id);
    if (index >= 0) referrals.splice(index, 1);
  });
}
