import { useEffect, useState } from 'react';
import type { PostingSignal } from '../../shared/jobs/posting-signals';
import { isLinkedInNetworkingPage } from '../../shared/jobs/linkedin-profile-id';
import { isProfileEditPage } from '../../shared/jobs/profile-pages';
import { scanTab } from '../services/active-tab-bridge';

/**
 * Posting age, applicants and pay for the page you are on, read as soon as you open it (no AI),
 * so the ghost-job warning shows before you spend time on a fit check.
 */
export function usePostingSignals(tabId: number | undefined, pageUrl: string | undefined): PostingSignal[] | undefined {
  const [signals, setSignals] = useState<PostingSignal[]>();
  useEffect(() => {
    setSignals(undefined);
    if (
      tabId == null ||
      !pageUrl ||
      !/^https?:/.test(pageUrl) ||
      isLinkedInNetworkingPage(pageUrl) ||
      isProfileEditPage(pageUrl)
    )
      return undefined;
    let isCurrent = true;
    scanTab(tabId)
      .then((scan) => isCurrent && setSignals(scan.signals))
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [tabId, pageUrl]);
  return signals;
}
