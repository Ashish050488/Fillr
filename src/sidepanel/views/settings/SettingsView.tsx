import React, { useState } from 'react';
import { readSavedTheme, saveTheme, type Theme } from '../../services/theme';
import BackupSection from './BackupSection';
import KeyManager from './KeyManager';
import UsageSummary from './UsageSummary';

const THEME_LABELS: Record<Theme, string> = { light: 'Black on white', dark: 'White on black' };

interface SettingsViewProps {
  onToast: (message: string) => void;
  onKeyCountChange?: (keyCount: number) => void;
}

/** AI keys and usage, look, keyboard shortcut, and backups. */
export default function SettingsView({ onToast, onKeyCountChange }: SettingsViewProps) {
  const [theme, setTheme] = useState<Theme>(readSavedTheme);
  const handleThemeChoice = (chosenTheme: Theme) => {
    setTheme(chosenTheme);
    saveTheme(chosenTheme);
  };

  return (
    <div className="stack fade-in">
      <section className="stack-sm">
        <p className="section-title">AI keys</p>
        <p className="muted small">
          Gemini Flash-Lite reads your resume, Gemma cleans job pages, and Gemini Flash judges fit and writes. Requests
          rotate across the free models and your keys. Keys from different Google projects add more free quota.
        </p>
        <KeyManager onKeyCountChange={onKeyCountChange} />
        <UsageSummary />
      </section>
      <hr className="rule" />
      <section className="stack-sm">
        <p className="section-title">Look</p>
        <div className="row">
          {(Object.keys(THEME_LABELS) as Theme[]).map((themeOption) => (
            <button
              key={themeOption}
              type="button"
              className={`btn ${theme === themeOption ? 'primary' : ''}`}
              onClick={() => handleThemeChoice(themeOption)}
            >
              {THEME_LABELS[themeOption]}
            </button>
          ))}
        </div>
      </section>
      <hr className="rule" />
      <section className="stack-sm">
        <p className="section-title">Shortcut</p>
        <p className="soft">
          <b>Alt + Shift + F</b> autofills the page you're on. Change it at chrome://extensions/shortcuts.
        </p>
      </section>
      <hr className="rule" />
      <BackupSection onToast={onToast} />
    </div>
  );
}
