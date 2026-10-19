import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '../../shared/messaging/extension-messages';
import type { MessageMap, ProfileBoost, ProfilePageScan } from '../../shared/types';
import { toPage } from '../services/active-tab-bridge';

type ScanReply = MessageMap['PROFILE_PAGE_SCAN']['response'];

/**
 * Your profile editor in the current tab: the boxes on it, the rewrite saved for it (shown at
 * once, no AI) and a way to ask for a fresh one.
 */
export function useProfileBoost(tabId: number | undefined, pageUrl: string | undefined) {
  const [scan, setScan] = useState<ProfilePageScan>();
  const [boost, setBoost] = useState<ProfileBoost>();
  const [isWriting, setIsWriting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const readPage = useCallback(async (): Promise<ProfilePageScan> => {
    if (tabId == null) throw new Error('Open your profile editor first.');
    const reply = await toPage<ScanReply>(tabId, { action: 'PROFILE_PAGE_SCAN' });
    if (!reply?.success || !reply.scan) throw new Error(reply?.error ?? 'Could not read this page. Refresh it.');
    setScan(reply.scan);
    return reply.scan;
  }, [tabId]);

  useEffect(() => {
    setScan(undefined);
    setBoost(undefined);
    setErrorMessage('');
    let isCurrent = true;
    readPage()
      .then((pageScan) => sendMessage('PROFILE_BOOST', { scan: pageScan, cachedOnly: true }))
      .then((reply) => isCurrent && reply.success && setBoost(reply.boost))
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [readPage, pageUrl]);

  const rewrite = useCallback(
    async (refresh: boolean) => {
      setIsWriting(true);
      setErrorMessage('');
      try {
        const reply = await sendMessage('PROFILE_BOOST', { scan: await readPage(), refresh });
        if (!reply.success || !reply.boost) throw new Error(reply.error ?? 'Could not rewrite your profile.');
        setBoost(reply.boost);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not rewrite your profile.');
      } finally {
        setIsWriting(false);
      }
    },
    [readPage],
  );

  const rescan = useCallback(() => readPage().catch(() => undefined), [readPage]);
  return { scan, boost, isWriting, errorMessage, rewrite, rescan };
}
