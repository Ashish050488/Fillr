import React from 'react';
import type { Referral, ReferralStatus } from '../../../shared/types';
import Dropdown from '../../components/Dropdown';
import Icon from '../../components/Icon';
import Sheet from '../../components/Sheet';
import { copyText } from '../../services/text-export';
import { isFollowUpDue, REFERRAL_STATUS_LABELS } from './referral-summary';
import { formatShortDate } from './tracker-filters';

const SENT_STATUSES: ReferralStatus[] = ['asked', 'replied', 'referred', 'declined'];

/** One person on one line: name, role at company and when; status or "Follow up" on the right. */
export function ReferralRow({ referral, onOpen }: { referral: Referral; onOpen: () => void }) {
  const when =
    referral.status === 'drafted'
      ? `written ${formatShortDate(referral.draftedAt)}`
      : formatShortDate(referral.askedAt ?? referral.draftedAt);
  return (
    <button type="button" className="row-compact" onClick={onOpen} aria-haspopup="dialog">
      <span>
        <span className="row-title">{referral.personName || 'Someone'}</span>
        <span className="row-meta">{[referral.personRole, referral.company, when].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="row-side">
        {isFollowUpDue(referral) ? (
          <b className="badge solid">Follow up</b>
        ) : (
          <span>{REFERRAL_STATUS_LABELS[referral.status]}</span>
        )}
      </span>
    </button>
  );
}

interface ReferralSheetProps {
  referral: Referral;
  onClose: () => void;
  onStatusChange: (status: ReferralStatus) => void;
  onDelete: () => void;
  onToast: (message: string) => void;
}

/** Everything about one person: who they are to you, what you sent, status and follow-ups. */
export function ReferralSheet({ referral, onClose, onStatusChange, onDelete, onToast }: ReferralSheetProps) {
  const statuses = referral.status === 'drafted' ? (['drafted', ...SENT_STATUSES] as ReferralStatus[]) : SENT_STATUSES;
  return (
    <Sheet
      title={referral.personName || 'Someone'}
      subtitle={[referral.personRole, referral.company].filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <dl className="detail-grid">
        {referral.persona && (
          <>
            <dt>Who</dt>
            <dd>{referral.persona}</dd>
          </>
        )}
        <dt>{referral.status === 'drafted' ? 'Written' : 'Asked'}</dt>
        <dd>
          {formatShortDate(referral.askedAt ?? referral.draftedAt)}
          {referral.channel ? ` by ${referral.channel}` : ''}
        </dd>
        {Boolean(referral.followUpCount) && (
          <>
            <dt>Follow-ups</dt>
            <dd>{referral.followUpCount}</dd>
          </>
        )}
        {referral.jobUrl && (
          <>
            <dt>Job</dt>
            <dd>
              <a href={referral.jobUrl} target="_blank" rel="noreferrer">
                {referral.jobUrl}
              </a>
            </dd>
          </>
        )}
      </dl>
      {isFollowUpDue(referral) && (
        <p className="small">
          No reply for a week. Open their profile and choose <b>Ask for: a follow-up</b>.
        </p>
      )}
      <div className="status-field">
        <span className="status-label">Status</span>
        <Dropdown
          isCompact
          ariaLabel={`Status for ${referral.personName}`}
          value={referral.status}
          options={statuses.map((status) => ({ value: status, label: REFERRAL_STATUS_LABELS[status] }))}
          onChange={(status) => onStatusChange(status as ReferralStatus)}
        />
      </div>
      {referral.message && <div className="preview-text">{referral.message}</div>}
      <div className="row between">
        <div className="row">
          <a className="btn" href={referral.profileUrl} target="_blank" rel="noreferrer">
            <Icon name="external" /> Profile
          </a>
          {referral.message && (
            <button
              className="btn"
              type="button"
              onClick={() => void copyText(referral.message!).then(() => onToast('Copied'))}
            >
              <Icon name="copy" /> Copy message
            </button>
          )}
        </div>
        <button
          className="btn icon quiet"
          type="button"
          aria-label={`Remove ${referral.personName}`}
          onClick={onDelete}
        >
          <Icon name="trash" />
        </button>
      </div>
    </Sheet>
  );
}
