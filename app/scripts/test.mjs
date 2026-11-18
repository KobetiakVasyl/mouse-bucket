// Starts Vitest from the app folder with an upper-case drive letter, because it fails on Windows otherwise. See docs/ENVIRONMENTS.md.
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..').replace(/^[a-z]:/, (drive) =>
  drive.toUpperCase()
)
const vitest = join(appDir, 'node_modules', 'vitest', 'vitest.mjs')

const result = spawnSync(process.execPath, [vitest, 'run', ...process.argv.slice(2)], {
  cwd: appDir,
  stdio: 'inherit'
})
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
