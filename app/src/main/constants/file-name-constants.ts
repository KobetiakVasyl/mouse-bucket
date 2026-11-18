// What a safe default name for the Save dialog may not contain or be. See docs/SECURITY.md.
export const FORBIDDEN_NAME_CHARACTERS = /[<>:"/\\|?*\p{Cc}]/gu
export const RESERVED_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i
export const TRAILING_DOTS_AND_SPACES = /[. ]+$/
export const MAX_NAME_LENGTH = 200
export const FALLBACK_NAME = 'download'
