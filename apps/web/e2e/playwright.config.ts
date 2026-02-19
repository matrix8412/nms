import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
  },
});
