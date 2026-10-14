export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'jobfill-theme';

export function applyTheme(theme: Theme): void {
  if (theme === 'light') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

/** Black on white unless you chose otherwise. Stored per browser; the theme is a convenience only. */
export function readSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private windows may block storage; the theme still applies for this session.
  }
}
