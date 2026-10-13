import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: { alias: { "@": "/src", "@test": "/test" } },
  build: { rollupOptions: { input: { onboarding: resolve(__dirname, "onboarding.html") } } },
});
