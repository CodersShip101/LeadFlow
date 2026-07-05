import { defineConfig, devices } from '@playwright/test'

// Formal e2e suite lives in e2e/tests/*.spec.ts (the e2e/*.mjs files are ad-hoc
// verification scripts, kept separate). Run: `npx playwright test`.
// Requires the dev server running on :3000 (npm run dev).
export default defineConfig({
  testDir: './e2e/tests',
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
