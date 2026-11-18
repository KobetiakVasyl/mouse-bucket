// End-to-end tests: the built app, driven through its window, with sample S3 data. See docs/ARCHITECTURE.md.
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  outputDir: '../.cache/playwright/results',
  timeout: 30_000,
  // Each test starts its own app; one at a time keeps windows from competing for focus.
  workers: 1,
  retries: process.env['CI'] === 'true' ? 1 : 0,
  reporter: 'list'
})
