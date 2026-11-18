// Turns an S3 key into a safe default name for the Save dialog. See docs/SECURITY.md.
import {
  FALLBACK_NAME,
  FORBIDDEN_NAME_CHARACTERS,
  MAX_NAME_LENGTH,
  RESERVED_NAMES,
  TRAILING_DOTS_AND_SPACES
} from '../constants/file-name-constants'

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
