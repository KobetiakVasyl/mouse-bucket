// Turns an S3 key into a safe default name for the Save dialog. See docs/SECURITY.md.
const FORBIDDEN = /[<>:"/\\|?*\p{Cc}]/gu
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i
const MAX_LENGTH = 200

export function saveNameFor(key: string): string {
  const parts = key.split('/').filter((part) => part !== '')
  if (parts.length === 0) return 'download'
  const name = parts[parts.length - 1]
    .replace(FORBIDDEN, '_')
    .slice(0, MAX_LENGTH)
    .replace(/[. ]+$/, '')
  if (name === '') return 'download'
  return RESERVED.test(name) ? `_${name}` : name
}
