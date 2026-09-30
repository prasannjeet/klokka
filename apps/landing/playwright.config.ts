import { networkInterfaces } from 'node:os';
import { defineConfig, devices } from '@playwright/test';

// Three projects (docs/research/web.md section 8):
//   layout  gating real-browser checks at the phone sizes and desktop, both languages (dev server on localhost)
//   lan     the same site over this host's LAN address, proving it hydrates there (AGENTS.md, local previews)
//   shots   non-gating screenshot producer for visual review against docs/design/mockups/landing.html
// Set PW_BASE_URL to test a running build instead of starting `next dev`; LAN_URL overrides the LAN address.
// PW_EXPECT_INDEXABLE=true expects a build made with NEXT_PUBLIC_INDEXABLE=true (default: noindex, like `next dev`).

const PORT = 3001;

function lanAddress(): string {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const a of addresses ?? []) {
      if (a.family === 'IPv4' && !a.internal && a.address.startsWith('192.168.')) return a.address;
    }
  }
  throw new Error('No 192.168.x.x address on this host; set LAN_URL.');
}

const baseURL = process.env.PW_BASE_URL ?? `http://localhost:${PORT}`;
const lanURL = process.env.LAN_URL ?? `http://${lanAddress()}:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], baseURL, trace: 'off' },
  ...(process.env.PW_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: `http://localhost:${PORT}/`,
          reuseExistingServer: true,
          timeout: 180_000,
        },
      }),
  projects: [
    { name: 'layout', testMatch: /layout\.spec\.ts/ },
    { name: 'lan', testMatch: /lan\.spec\.ts/, use: { baseURL: lanURL } },
    { name: 'shots', testMatch: /shots\.spec\.ts/, use: { baseURL: lanURL } },
  ],
});
