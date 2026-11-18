// Runs a dev dependency's command with Electron's and electron-builder's caches in the repo's .cache/ folder. See docs/ENVIRONMENTS.md.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheRoot = join(appDir, '..', '.cache')

const [command, ...args] = process.argv.slice(2)
if (!command) {
  console.error('Usage: node scripts/with-caches.mjs <command> [args...]')
  process.exit(2)
}

/**
 * Finds the JavaScript file behind a command that one of the app's dev dependencies provides.
 * @param {string} name
 * @returns {string | undefined}
 */
function commandEntry(name) {
  /** @type {{ devDependencies?: Record<string, string> }} */
  const app = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'))
  for (const dependency of Object.keys(app.devDependencies ?? {})) {
    const packageDir = join(appDir, 'node_modules', dependency)
    /** @type {{ name: string, bin?: string | Record<string, string> }} */
    let manifest
    try {
      manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
    } catch {
      continue
    }
    const bins = typeof manifest.bin === 'string' ? { [manifest.name]: manifest.bin } : manifest.bin
    const entry = bins?.[name]
    if (entry) return join(packageDir, entry)
  }
  return undefined
}

const entry = commandEntry(command)
if (!entry) {
  console.error(`No dev dependency provides the command "${command}".`)
  process.exit(2)
}

const callerSetsCaches =
  process.env.electron_config_cache !== undefined ||
  process.env.ELECTRON_BUILDER_CACHE !== undefined

/** @type {NodeJS.ProcessEnv} */
const env = {
  ...process.env,
  electron_config_cache: process.env.electron_config_cache ?? join(cacheRoot, 'electron'),
  ELECTRON_BUILDER_CACHE: process.env.ELECTRON_BUILDER_CACHE ?? join(cacheRoot, 'electron-builder')
}
if (!callerSetsCaches) {
  const tempDir = join(cacheRoot, 'tmp')
  mkdirSync(tempDir, { recursive: true })
  Object.assign(env, { TMP: tempDir, TEMP: tempDir, TMPDIR: tempDir })
}

const result = spawnSync(process.execPath, [entry, ...args], { stdio: 'inherit', env })
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
