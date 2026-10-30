import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: '.',
  testMatch: 'homepage.spec.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4391',
    browserName: 'chromium',
    channel: process.env.HOMEPAGE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/preview-site.mjs',
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    url: 'http://127.0.0.1:4391',
    reuseExistingServer: !process.env.CI,
  },
});
