import { defineConfig, devices } from '@playwright/test';

// Fluxos de ponta a ponta no build de produção, contra a API falsa de
// e2e/api-falsa.mjs. Rode com `npm run e2e` (faz o build antes).
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
    command: 'node e2e/servidor.mjs dist/athena-front/browser 4300',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
  },
});
