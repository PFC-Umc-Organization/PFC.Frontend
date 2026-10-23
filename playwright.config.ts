import { defineConfig, devices } from '@playwright/test';

// End-to-end flows on the production build, against e2e/fake-api.mjs.
// Run with `npm run e2e`, which builds first.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4300',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 820 } } }],
  webServer: {
    command: 'node e2e/server.mjs dist/athena-front/browser 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
  },
});
