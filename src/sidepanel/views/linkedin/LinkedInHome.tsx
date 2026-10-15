import React, { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { LinkedInCoach, Referral } from '../../../shared/types';
import { useStoredValue } from '../../hooks/useStoredValue';
import { openInCurrentTab } from '../../services/active-tab-bridge';
import FindPeople from '../tracker/FindPeople';
import { isFollowUpDue } from '../tracker/referral-summary';
import CoachPlan from './CoachPlan';

type HomeTab = 'find' | 'plan' | 'followUp';
const RETRY_DELAY_MILLISECONDS = 1200;

/**
 * The side panel on LinkedIn, in three tabs: one-click searches for the right people (they open
 * on this page), today's AI plan (written once a day) and the people waiting for a follow-up.
 */
export default function LinkedInHome({ onToast }: { onToast: (message: string) => void }) {
  const referrals = useStoredValue<Referral[]>(STORAGE_KEYS.REFERRALS, []);
  const [coach, setCoach] = useState<LinkedInCoach>();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>('find');
  const followUps = referrals.filter((referral) => isFollowUpDue(referral));

  const loadCoach = useCallback(
    async (refresh: boolean) => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        // Right after JobFill reloads, the first message can fail: try once more before giving up.
        const reply = await sendMessage('LINKEDIN_COACH', { refresh }).catch(async () => {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MILLISECONDS));
          return sendMessage('LINKEDIN_COACH', { refresh });
        });
        if (!reply.success || !reply.coach) throw new Error(reply.error ?? 'Could not get suggestions.');
        setCoach(reply.coach);
        if (refresh) onToast('New suggestions');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not get suggestions.');
      } finally {
        setIsLoading(false);
      }
    },
    [onToast],
  );
  useEffect(() => {
    void loadCoach(false);
  }, [loadCoach]);

  const tabs: Array<[HomeTab, string, number | undefined]> = [
    ['find', 'Find people', undefined],
    ['plan', 'Today’s plan', coach?.plan.length],
    ['followUp', 'Follow up', followUps.length],
  ];

  return (
    <div className="stack-sm fade-in">
      <header className="job-head">
        <p className="tiny">linkedin.com</p>
        <h1>Ask for referrals</h1>
      </header>
      <p className="soft small">
        {coach?.focus ||
          'Pick a search, open a profile and press Write referral (bottom right). JobFill writes it into their message box; you press Send.'}
      </p>
      <div className="segments" role="tablist" aria-label="LinkedIn">
        {tabs.map(([tab, label, count]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            className="segment"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {label}
            {count ? <span className="count">{count}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {activeTab === 'find' && <FindPeople onToast={onToast} />}
        {activeTab === 'plan' && (
          <CoachPlan
            coach={coach}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onRefresh={() => void loadCoach(true)}
          />
        )}
        {activeTab === 'followUp' &&
          (followUps.length ? (
            <div className="list">
              {followUps.map((referral) => (
                <button
                  key={referral.id}
                  type="button"
                  className="row-compact"
                  onClick={() => void openInCurrentTab(referral.profileUrl)}
                >
                  <span>
                    <span className="row-title">{referral.personName}</span>
                    <span className="row-meta">
                      {[referral.personRole, referral.company].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="row-side">Open profile</span>
                </button>
              ))}
              <p className="muted small">On their profile, choose Ask for: follow-up, then Write referral.</p>
            </div>
          ) : (
            <p className="soft small">Nobody is waiting. People who don’t reply within a week show up here.</p>
          ))}
      </div>
    </div>
  );
}
