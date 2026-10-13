import React from 'react';
import { createRoot } from 'react-dom/client';

function Options() {
  return <main><h1>JobFill settings</h1><section><h2>Profile</h2><p>Manage your application profile and preferences.</p></section><section><h2>AI keys</h2><p>Provider configuration will appear here.</p></section></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Options /></React.StrictMode>);
