import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL === "chrome" ? "chrome" : undefined,
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "allow",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "pnpm build && node tests/pwa-server.mjs",
    env: { VITE_API_URL: "" },
    timeout: 120_000,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false
  }
});
