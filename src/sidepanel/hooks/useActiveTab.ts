import { useCallback, useEffect, useState } from 'react';
import { activeTab, type ActiveTab } from '../services/active-tab-bridge';

/**
 * The browser tab you are looking at, kept current as you switch or load pages, plus the latest
 * progress text the background reports while AI works on it.
 */
export function useActiveTab(onTabChange: () => void) {
  const [currentTab, setCurrentTab] = useState<ActiveTab>();
  const [progressText, setProgressText] = useState('');

  const refreshTab = useCallback(() => {
    void activeTab().then((nextTab) => {
      setCurrentTab(nextTab);
      onTabChange();
    });
  }, [onTabChange]);

  useEffect(() => {
    refreshTab();
    const handleTabActivated = () => refreshTab();
    const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, changedTab: chrome.tabs.Tab) => {
      if (changedTab.active && changeInfo.status === 'complete') refreshTab();
    };
    const handleProgress = (message: { action?: string; payload?: { text?: string } }) => {
      if (message?.action === 'FILL_PROGRESS' && message.payload?.text) setProgressText(message.payload.text);
    };
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.runtime.onMessage.addListener(handleProgress);
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.runtime.onMessage.removeListener(handleProgress);
    };
  }, [refreshTab]);

  return { currentTab, progressText, setProgressText };
}
