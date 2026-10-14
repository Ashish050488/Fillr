import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';
export { emptyProfile } from './profile/create-empty-profile';

export { App };
export function mount(component: React.ReactNode) {
  const root = document.getElementById('app');
  if (root)
    createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>{component}</ErrorBoundary>
      </React.StrictMode>,
    );
}
