// Gives tests a fresh folder under the repo's .cache/tmp/, never the system temp folder. See docs/ENVIRONMENTS.md.
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { repoPath } from './paths'

const root = repoPath('.cache/tmp/tests/')

export async function makeTempDir(): Promise<string> {
  await mkdir(root, { recursive: true })
  return mkdtemp(join(root, 'run-'))
}

export async function removeTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}
