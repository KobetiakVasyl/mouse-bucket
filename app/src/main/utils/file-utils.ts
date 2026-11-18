// Reads and atomically writes the app's files in its data folder, one write at a time. See docs/ENVIRONMENTS.md.
import { mkdirSync, renameSync, type Stats, writeFileSync } from 'node:fs'
import {
  access,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  stat,
  writeFile
} from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { TEMPORARY_SUFFIX } from '../constants/data-file-constants'

export async function readIfExists(path: string): Promise<Buffer | undefined> {
  try {
    return await readFile(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  }
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
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

// The text a JSON file is written with: indented, with a final newline.
export function toJsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export async function writeAtomically(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}${TEMPORARY_SUFFIX}`
  await writeFile(temporary, data)
  await rename(temporary, path)
}

// For the few moments that can't wait, such as the window closing.
export function writeAtomicallySync(path: string, data: string): void {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}${TEMPORARY_SUFFIX}`
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

// A file's size in bytes, or 0 when it doesn't exist.
export async function sizeOrZero(path: string): Promise<number> {
  try {
    return (await stat(path)).size
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 0
    throw error
  }
}

// `length` bytes of a file from `start`, for one part of an upload.
export async function readRange(path: string, start: number, length: number): Promise<Buffer> {
  const file = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(length)
    let read = 0
    while (read < length) {
      const { bytesRead } = await file.read(buffer, read, length - read, start + read)
      if (bytesRead === 0) throw new Error('The file got shorter while it was being uploaded.')
      read += bytesRead
    }
    return buffer
  } finally {
    await file.close()
  }
}

// Every file in a folder, at any depth, sorted by path. Links are skipped, so a link to a parent folder can't loop.
export async function listFiles(folder: string): Promise<{ path: string; info: Stats }[]> {
  const entries = await readdir(folder, { withFileTypes: true, recursive: true })
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
  const found: { path: string; info: Stats }[] = []
  for (const path of files) {
    const info = await lstat(path)
    if (info.isFile()) found.push({ path, info })
  }
  return found
}
