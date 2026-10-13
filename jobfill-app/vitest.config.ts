import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom", setupFiles: ["./test/setup.ts"], globals: true, passWithNoTests: true },
  resolve: { alias: { "@": "/src", "@test": "/test" } },
});
