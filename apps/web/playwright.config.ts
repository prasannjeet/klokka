import { defineConfig, devices } from '@playwright/test';

// Three projects (docs/research/web.md section 8):
//   layout  gating: no horizontal overflow and 44 px targets at 360/390/412/430 phone widths + desktop
//   visual  non-gating: screenshots of every screen, light and dark, written to .shots/ to look at
//   lan     gating: the app over the LAN address hydrates (typing into the week grid changes the total)
// By default the mock API (Prism, port 4010) and `next dev` with the development fake session are
// started here; set PW_NO_SERVER=1 to run against servers that are already up.
const LOCAL = process.env.PW_BASE_URL ?? 'http://localhost:3000';
const LAN = process.env.PW_LAN_URL ?? 'http://192.168.0.16:3000';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'node_modules/.cache/playwright/results',
  fullyParallel: false,
  workers: 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    { name: 'layout', testMatch: /layout\.spec\.ts$/, use: { baseURL: LOCAL } },
    { name: 'visual', testMatch: /visual\.spec\.ts$/, use: { baseURL: LOCAL } },
    { name: 'lan', testMatch: /lan\.spec\.ts$/, use: { baseURL: LAN } },
  ],
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : [
        {
          command: 'npm run mock:api',
          cwd: '../..',
          url: 'http://localhost:4010/me',
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: 'npm run dev',
          url: 'http://localhost:3000/healthz',
          reuseExistingServer: true,
          timeout: 120_000,
          env: { KLOKKA_DEV_FAKE_SESSION: '1', KLOKKA_API_BASE_URL: 'http://localhost:4010' },
        },
      ],
});
