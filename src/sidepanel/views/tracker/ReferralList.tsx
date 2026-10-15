import React, { useState } from 'react';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import { STORAGE_KEYS } from '../../../shared/storage/extension-storage';
import type { Referral, ReferralStatus } from '../../../shared/types';
import Icon from '../../components/Icon';
import Sheet from '../../components/Sheet';
import StatStrip from '../../components/StatStrip';
import { useStoredValue } from '../../hooks/useStoredValue';
import FindPeople from './FindPeople';
import { isFollowUpDue, summarizeReferrals } from './referral-summary';
import { ReferralRow, ReferralSheet } from './ReferralSheet';

const REFERRAL_FILTERS = {
  All: (referral: Referral) => referral.status !== 'drafted',
  'Follow up': (referral: Referral) => isFollowUpDue(referral),
  Replied: (referral: Referral) => referral.status === 'replied',
  Referred: (referral: Referral) => referral.status === 'referred',
  'Not sent': (referral: Referral) => referral.status === 'drafted',
} as const;
type ReferralFilter = keyof typeof REFERRAL_FILTERS;

/** Everyone you messaged on LinkedIn: one line each, details and the message one click away. */
export default function ReferralList({ onToast }: { onToast: (message: string) => void }) {
  const referrals = useStoredValue<Referral[]>(STORAGE_KEYS.REFERRALS, []);
  const [activeFilter, setActiveFilter] = useState<ReferralFilter>('All');
  const [companyFilter, setCompanyFilter] = useState<string>();
  const [openId, setOpenId] = useState<string>();
  const [isFindingPeople, setIsFindingPeople] = useState(false);
  const summary = summarizeReferrals(referrals);
  const visibleReferrals = referrals
    .filter(REFERRAL_FILTERS[activeFilter])
    .filter((referral) => !companyFilter || (referral.company ?? '').toLowerCase() === companyFilter.toLowerCase())
    .sort((first, second) => (second.askedAt ?? second.draftedAt) - (first.askedAt ?? first.draftedAt));
  const openReferral = referrals.find((referral) => referral.id === openId);

  const handleDelete = async (referral: Referral) => {
    if (!window.confirm(`Remove ${referral.personName || 'this person'} from your referrals?`)) return;
    const reply = await sendMessage('REFERRAL_DELETE', { id: referral.id });
    setOpenId(undefined);
    onToast(reply.success ? 'Removed' : (reply.error ?? 'Could not remove.'));
  };

  return (
    <div className="stack">
      <div className="row between">
        <StatStrip
          stats={[
            { value: summary.askedThisWeekCount, label: 'this week' },
            { value: summary.askedCount, label: 'asked' },
            { value: summary.referredCount, label: 'referred' },
          ]}
        />
        <button className="btn" type="button" aria-haspopup="dialog" onClick={() => setIsFindingPeople(true)}>
          <Icon name="external" /> Find people
        </button>
      </div>
      {referrals.length > 0 && (
        <div className="chips one-line" aria-label="Filter">
          {(Object.keys(REFERRAL_FILTERS) as ReferralFilter[]).map((filterName) => (
            <button
              key={filterName}
              type="button"
              className={`chip ${activeFilter === filterName ? 'on' : ''}`}
              onClick={() => setActiveFilter(filterName)}
            >
              {filterName}
              <span className="count">{referrals.filter(REFERRAL_FILTERS[filterName]).length}</span>
            </button>
          ))}
        </div>
      )}
      {summary.companies.length > 0 && (
        <div className="chips one-line" aria-label="Companies you asked at">
          {summary.companies.map((company) => {
            const isOn = companyFilter === company.company;
            return (
              <button
                key={company.company}
                type="button"
                className={`chip ${isOn ? 'on' : ''}`}
                aria-pressed={isOn}
                title={company.referredCount ? `${company.referredCount} referred you` : undefined}
                onClick={() => setCompanyFilter(isOn ? undefined : company.company)}
              >
                {company.company}
                <span className="count">{company.askedCount}</span>
              </button>
            );
          })}
        </div>
      )}
      {!referrals.length && (
        <div className="empty">
          <h2>No referral asks yet</h2>
          <p className="soft">
            Press <b>Find people</b>, open a profile on LinkedIn and press “Referral message” (bottom left). JobFill
            writes it; you press Send, and it shows up here with their company.
          </p>
        </div>
      )}
      {referrals.length > 0 && !visibleReferrals.length && <p className="soft small">Nobody here yet.</p>}
      <div className="list">
        {visibleReferrals.map((referral) => (
          <ReferralRow key={referral.id} referral={referral} onOpen={() => setOpenId(referral.id)} />
        ))}
      </div>
      {openReferral && (
        <ReferralSheet
          referral={openReferral}
          onClose={() => setOpenId(undefined)}
          onStatusChange={(status: ReferralStatus) =>
            void sendMessage('REFERRAL_UPDATE', { id: openReferral.id, status })
          }
          onDelete={() => void handleDelete(openReferral)}
          onToast={onToast}
        />
      )}
      {isFindingPeople && (
        <Sheet
          title="Find people to ask"
          subtitle="One click, opens on this page"
          onClose={() => setIsFindingPeople(false)}
        >
          <FindPeople onToast={onToast} onOpened={() => setIsFindingPeople(false)} />
        </Sheet>
      )}
    </div>
  );
}
