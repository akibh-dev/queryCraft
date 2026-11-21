import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";
export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL,
    serviceWorkers: "block",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4173 --strictPort",
    url: baseURL,
  },
});
