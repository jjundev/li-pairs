import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:5199/',
    browserName: 'chromium',
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: 'node e2e/make-fixtures.mjs && npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199/',
    reuseExistingServer: false,
    env: { VITE_DATA_BASE: './e2e-data/' },
  },
});
