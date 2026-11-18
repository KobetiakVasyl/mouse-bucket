// Prints the github MCP server's auth header from .env.staging, so never run it by hand. See docs/ENVIRONMENTS.md.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env.staging')
const token = existsSync(envFile)
  ? parseEnv(readFileSync(envFile, 'utf8')).GITHUB_MCP_PAT?.trim()
  : undefined

if (!token) {
  console.error(`GITHUB_MCP_PAT not found in ${envFile}.`)
  process.exit(1)
}

process.stdout.write(JSON.stringify({ Authorization: `Bearer ${token}` }))
