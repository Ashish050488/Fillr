import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JobFill: AI job application autofill',
    short_name: 'JobFill',
    description:
      'Check your fit for any job, then autofill the whole application with a cover letter written for that company. Private, free Gemini keys.',
    permissions: ['storage', 'unlimitedStorage', 'scripting', 'activeTab', 'sidePanel', 'tabs'],
    host_permissions: [
      '<all_urls>',
      'https://generativelanguage.googleapis.com/*',
      'https://openrouter.ai/*',
      'https://api.groq.com/*',
    ],
    action: { default_title: 'Open JobFill' },
    commands: {
      autofill: { suggested_key: { default: 'Alt+Shift+F' }, description: 'Autofill this job application' },
    },
  },
});
