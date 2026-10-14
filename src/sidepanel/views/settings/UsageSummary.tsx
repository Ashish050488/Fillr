import React, { useEffect, useState } from 'react';
import { sendMessage } from '../../../shared/messaging/extension-messages';
import type { MessageMap } from '../../../shared/types';

type UsageRow = MessageMap['AI_USAGE']['response']['rows'][number];

/** Today's free-tier use per model (resets at midnight Pacific, like Google's quotas). */
export default function UsageSummary() {
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  useEffect(() => {
    void sendMessage('AI_USAGE', undefined)
      .then((reply) => setUsageRows(reply.rows))
      .catch(() => undefined);
  }, []);
  if (!usageRows.length) return null;
  return (
    <div className="sheet flat stack-sm">
      <p className="tiny">Free quota used today</p>
      {usageRows.map((usageRow) => (
        <div className="row between small" key={usageRow.model}>
          <span>{usageRow.model}</span>
          <b>{usageRow.exhausted ? 'used up today' : `${usageRow.used} / ${usageRow.limit}`}</b>
        </div>
      ))}
    </div>
  );
}
