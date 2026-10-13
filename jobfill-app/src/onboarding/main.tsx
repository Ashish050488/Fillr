import React from 'react';
import { createRoot } from 'react-dom/client';

function Onboarding() {
  return <main><h1>Welcome to JobFill</h1><p>Set up your profile once, then fill applications faster.</p><button type="button">Get started</button></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Onboarding /></React.StrictMode>);
