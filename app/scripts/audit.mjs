// Fails on high or critical advisories that aren't in audit-allowlist.json. See docs/SECURITY.md.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { advisoriesFrom, checkAdvisories } from './audit-check.mjs'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const audit = spawnSync('npm audit --json --package-lock-only', {
  cwd: appDir,
  encoding: 'utf8',
  shell: true
})
if (!audit.stdout) {
  console.error(audit.stderr || 'npm audit printed nothing.')
  process.exit(2)
}

const report = JSON.parse(audit.stdout)
if (report.error) {
  console.error(`npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`)
  process.exit(2)
}

const allowlist = JSON.parse(readFileSync(join(appDir, 'audit-allowlist.json'), 'utf8'))
const { unreviewed, allowed, stale } = checkAdvisories(advisoriesFrom(report), allowlist)

for (const advisory of allowed) {
  console.log(`Allowed: ${advisory.id} (${advisory.package}, ${advisory.severity})`)
}
for (const entry of stale) {
  console.log(
    `No longer reported, remove it from audit-allowlist.json: ${entry.id} (${entry.package})`
  )
}
for (const advisory of unreviewed) {
  console.error(
    `Unreviewed ${advisory.severity} advisory: ${advisory.id} in ${advisory.package}: ${advisory.title}`
  )
}

if (unreviewed.length > 0) process.exit(1)
console.log('No unreviewed high or critical advisories.')
