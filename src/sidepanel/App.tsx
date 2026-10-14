import React, { useEffect, useState } from 'react';
import { sendMessage } from '../shared/messaging/extension-messages';
import Logo from './components/Logo';
import Spinner from './components/Spinner';
import { useToast } from './hooks/useToast';
import { useProfileController } from './hooks/useProfileController';
import JobView from './views/job/JobView';
import ProfileView from './views/profile/ProfileView';
import TrackerView from './views/tracker/TrackerView';
import { applyTheme, readSavedTheme } from './services/theme';
import SetupView from './views/setup/SetupView';
import SettingsView from './views/settings/SettingsView';
import './styles/paper.css';

const VIEWS = ['Job', 'Profile', 'Tracker', 'Settings'] as const;
type View = (typeof VIEWS)[number];

export function App({ wide = false }: { wide?: boolean }) {
  const [activeView, setActiveView] = useState<View>(() => {
    const requestedView = decodeURIComponent(window.location.hash.slice(1)) as View;
    return VIEWS.includes(requestedView) ? requestedView : 'Job';
  });
  const [hasKey, setHasKey] = useState<boolean>();
  const controller = useProfileController();
  const toast = useToast();

  useEffect(() => {
    applyTheme(readSavedTheme());
    document.body.classList.toggle('wide', wide);
  }, [wide]);
  useEffect(() => {
    // Right after an update the background is still waking up: retry instead of showing setup.
    let isActive = true;
    const checkForKeys = async (attempt = 0): Promise<void> => {
      try {
        const keyInfo = await sendMessage('AI_KEY_INFO', undefined);
        if (isActive) setHasKey(keyInfo.success ? keyInfo.keys.length > 0 : false);
      } catch {
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          return checkForKeys(attempt + 1);
        }
        if (isActive) setHasKey(false);
      }
    };
    void checkForKeys();
    return () => {
      isActive = false;
    };
  }, []);

  const profile = controller.snapshot?.profile;
  const isReady = hasKey && profile?.resume;
  const isLoading = hasKey === undefined || !controller.snapshot;

  return (
    <div className="shell">
      <header className="top">
        <div className="row between">
          <div className="brand">
            <Logo />
            <b>JobFill</b>
          </div>
          {profile?.fields.firstName?.value && (
            <span className="hand soft" style={{ fontSize: 20 }}>
              hi, {profile.fields.firstName.value.toLowerCase()}
            </span>
          )}
        </div>
        <nav className="tabs" aria-label="Sections">
          {VIEWS.map((viewName) => (
            <button
              key={viewName}
              type="button"
              className="tab"
              aria-current={activeView === viewName ? 'page' : undefined}
              onClick={() => setActiveView(viewName)}
            >
              {viewName}
            </button>
          ))}
        </nav>
      </header>
      <main className="main">
        {controller.busy && activeView !== 'Profile' && !(activeView === 'Job' && !isReady) && controller.feedback && (
          <p className="progress" style={{ marginBottom: 14 }}>
            <Spinner /> {controller.feedback.text}
          </p>
        )}
        {controller.loadError ? (
          <p className="note err">{controller.loadError}</p>
        ) : isLoading ? (
          <div className="empty">
            <Spinner />
          </div>
        ) : // Setup only replaces the Job tab; Profile, Tracker and Settings always stay reachable.
        activeView === 'Job' && !isReady ? (
          <SetupView hasKey={Boolean(hasKey)} onKeyAdded={() => setHasKey(true)} controller={controller} />
        ) : activeView === 'Job' ? (
          <JobView onToast={toast.show} onOpenTracker={() => setActiveView('Tracker')} />
        ) : activeView === 'Profile' ? (
          <ProfileView controller={controller} />
        ) : activeView === 'Tracker' ? (
          <TrackerView onToast={toast.show} />
        ) : (
          <SettingsView onToast={toast.show} onKeyCountChange={(keyCount) => setHasKey(keyCount > 0)} />
        )}
      </main>
      {toast.node}
    </div>
  );
}
