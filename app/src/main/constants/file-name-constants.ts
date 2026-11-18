// What a downloaded file's name may not contain or be, and how a numbered copy's name is made. See docs/SECURITY.md.
export const FORBIDDEN_NAME_CHARACTERS = /[<>:"/\\|?*\p{Cc}]/gu
export const RESERVED_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i
export const TRAILING_DOTS_AND_SPACES = /[. ]+$/
export const MAX_NAME_LENGTH = 200
export const FALLBACK_NAME = 'download'

// The extension a copy's number goes before: .tar.gz as a whole, otherwise the last one.
export const EXTENSION_PATTERN = /(?:\.tar)?\.[^.]+$/i
// How many numbered copies, such as report (2).pdf, a name may get in one folder.
export const MAX_NAME_COPIES = 1000
