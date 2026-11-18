// Checks the GitHub Actions workflows with actionlint, run in Docker. See docs/ENVIRONMENTS.md.
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const IMAGE =
  'rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667'
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${repoRoot}:/repo`,
    '-w',
    '/repo',
    IMAGE,
    '-color',
    ...process.argv.slice(2)
  ],
  { stdio: 'inherit' }
)
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
