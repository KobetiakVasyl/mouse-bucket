// Reads and atomically writes the app's files in its data folder, one write at a time. See docs/ENVIRONMENTS.md.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function readIfExists(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  }
}

// Returns undefined for text that isn't valid JSON, so callers treat a damaged file like an invalid one.
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export async function writeAtomically(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp`
  await writeFile(temporary, data)
  await rename(temporary, path)
}

// For the few moments that can't wait, such as the window closing.
export function writeAtomicallySync(path: string, data: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.tmp`
  writeFileSync(temporary, data)
  renameSync(temporary, path)
}

// Runs the given tasks one after another, in the order they were started.
export function serialize(): <T>(task: () => Promise<T>) => Promise<T> {
  let last: Promise<unknown> = Promise.resolve()
  return <T>(task: () => Promise<T>): Promise<T> => {
    const next = last.then(task, task)
    last = next.catch(() => undefined)
    return next
  }
}
