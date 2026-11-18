// Absolute paths into the app folder and the repo, for tests that read their files. See docs/ARCHITECTURE.md.
// __dirname works under both Vitest and Playwright, which loads tests as CommonJS.
import { resolve } from 'node:path'

// A path inside app/, such as 'package.json'.
export function appPath(relative: string): string {
  return resolve(__dirname, '../..', relative)
}

// A path from the repo root, such as '.node-version'.
export function repoPath(relative: string): string {
  return resolve(__dirname, '../../..', relative)
}
