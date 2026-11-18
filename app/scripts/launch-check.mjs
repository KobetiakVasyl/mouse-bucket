// Starts one environment's built app from dist/ with --launch-check and fails unless it renders. See docs/ENVIRONMENTS.md.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BUILDER_CONFIGS, builtAppSegments } from './launch-check-target.mjs'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const environment = process.argv[2] ?? ''
const config = BUILDER_CONFIGS.get(environment)
if (!config) {
  console.error('Usage: npm run launch-check -- staging|production')
  process.exit(2)
}

const segments = builtAppSegments({
  platform: process.platform,
  yaml: readFileSync(join(appDir, config), 'utf8'),
  version: JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')).version
})
const builtApp = segments && join(appDir, 'dist', ...segments)
if (!builtApp || !existsSync(builtApp)) {
  const distScript = environment === 'production' ? 'dist' : 'dist:staging'
  console.error(
    `No ${environment} build at ${builtApp ?? 'app/dist'}. Run npm run ${distScript} first.`
  )
  process.exit(2)
}

const env = { ...process.env, APPIMAGE_EXTRACT_AND_RUN: '1' }

console.log(`Launching ${builtApp} --launch-check`)
const result = spawnSync(builtApp, ['--launch-check'], { stdio: 'inherit', timeout: 90_000, env })

// The exit codes come from LaunchCheckExit in src/main/launch-check.ts.
/** @type {Map<number | null, string>} */
const outcomes = new Map([
  [0, 'the window rendered'],
  [10, "the window loaded but didn't render"],
  [11, 'the renderer process crashed'],
  [12, 'the app timed out before loading'],
  [13, 'another copy of this environment was already running'],
  [14, 'the page failed to load']
])
if (result.error) console.error(result.error.message)
const outcome =
  outcomes.get(result.status) ??
  `the app failed before the check finished (exit ${result.status ?? result.signal ?? 'unknown'})`
if (result.status === 0) {
  console.log(`Launch check passed: ${outcome}.`)
} else {
  console.error(`Launch check failed: ${outcome}.`)
  process.exit(1)
}
