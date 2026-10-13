import React from 'react';
import { createRoot } from 'react-dom/client';

function Popup() {
  return <main><h1>JobFill loads</h1><p>Scaffold only. Form filling is not available yet.</p></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Popup /></React.StrictMode>);
