// Fixed values for signing in to Google and talking to Google Drive. See docs/ARCHITECTURE.md and docs/SECURITY.md.

// Full Drive access, which uploading anywhere in a folder and browsing it need. The user's own OAuth client asks for it.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'

// The only page sign-in opens in the browser: Google's own consent page.
export const GOOGLE_SIGN_IN_ORIGIN = 'https://accounts.google.com'

// The one-time server that receives Google's answer listens only on this computer.
export const LOOPBACK_HOST = '127.0.0.1'
export const SIGN_IN_TIMEOUT_MS = 5 * 60_000

// What the browser shows once Google sent the user back. It loads nothing.
export const SIGNED_IN_PAGE =
  '<!doctype html><meta charset="utf-8"><title>MouseBucket</title>' +
  '<p style="font-family: sans-serif">You can close this tab and go back to MouseBucket.</p>'
export const SIGN_IN_FAILED_PAGE =
  '<!doctype html><meta charset="utf-8"><title>MouseBucket</title>' +
  '<p style="font-family: sans-serif">Signing in didn\'t finish. Go back to MouseBucket and try again.</p>'
export const SIGN_IN_PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
  Connection: 'close'
}

export const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
// Google Docs, Sheets, Slides and other Google files have no content to download as they are.
export const GOOGLE_FILE_MIME_PREFIX = 'application/vnd.google-apps.'
export const GOOGLE_FILE_REASON = "Google Docs, Sheets and Slides files can't be downloaded yet."

export const LIST_FIELDS = 'nextPageToken, files(id, name, mimeType, size, modifiedTime)'
export const LISTING_PAGE_SIZE = 1000

// Resumable uploads: a session URL from here takes the file's chunks, and answers 308 until it has them all.
export const UPLOAD_SESSION_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,md5Checksum'
export const UPLOAD_SESSION_ORIGIN = 'https://www.googleapis.com'
export const RESUME_INCOMPLETE = 308
// Drive forgets a session after a week, and then answers these.
export const SESSION_GONE_STATUSES: ReadonlySet<number> = new Set([404, 410])

// Drive's reasons for a 403 that waiting fixes.
export const RATE_LIMIT_REASONS: ReadonlySet<string> = new Set([
  'userRateLimitExceeded',
  'rateLimitExceeded'
])

export const SIGN_IN_EXPIRED_MESSAGE =
  "Google no longer accepts this template's sign-in. Edit the template and enter its OAuth client again to sign in."
