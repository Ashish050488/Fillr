import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "JobFill",
  version: "2.0.0",
  description: "Private job application autofill and tailoring assistant.",
  permissions: ["storage", "unlimitedStorage", "activeTab", "scripting"],
  host_permissions: [
    "https://generativelanguage.googleapis.com/*",
    "https://openrouter.ai/*",
    "https://api.groq.com/*",
  ],
  action: {
    default_popup: "popup.html",
  },
  background: {
    service_worker: "src/background/worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/script.ts"],
      run_at: "document_idle",
    },
  ],
  options_ui: { page: "options.html", open_in_tab: true },
};

export default manifest;
