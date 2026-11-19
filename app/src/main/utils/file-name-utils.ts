// Turns an S3 key into a safe file name, and names numbered copies such as report (2).pdf. See docs/SECURITY.md.
import {
  EXTENSION_PATTERN,
  FALLBACK_NAME,
  FORBIDDEN_NAME_CHARACTERS,
  MAX_NAME_LENGTH,
  RESERVED_NAMES,
  TRAILING_DOTS_AND_SPACES
} from '../constants/file-name-constants'
import { isAbsolute, relative } from 'node:path'

export function saveNameFor(key: string): string {
  const parts = key.split('/').filter((part) => part !== '')
  if (parts.length === 0) return FALLBACK_NAME
  const name = parts[parts.length - 1]
    .replace(FORBIDDEN_NAME_CHARACTERS, '_')
    .slice(0, MAX_NAME_LENGTH)
    .replace(TRAILING_DOTS_AND_SPACES, '')
  if (name === '') return FALLBACK_NAME
  return RESERVED_NAMES.test(name) ? `_${name}` : name
}

// The name with " (n)" before its extension; copy 1 is the name itself.
export function numberedName(name: string, copy: number): string {
  if (copy === 1) return name
  const match = EXTENSION_PATTERN.exec(name)
  const end = match === null || match.index === 0 ? name.length : match.index
  return `${name.slice(0, end)} (${copy})${name.slice(end)}`
}

// Whether a path lies inside a folder, and isn't the folder itself.
export function isInside(folder: string, path: string): boolean {
  const inner = relative(folder, path)
  return inner !== '' && !inner.startsWith('..') && !isAbsolute(inner)
}
