// Pure helpers for GoogleDriveService: search queries, folder listings, upload session answers and Google's errors. See
// docs/ARCHITECTURE.md.
import type { drive_v3 } from '@googleapis/drive'
import type { FolderEntry, StoredFile } from '../../shared/types/storage-types'
import {
  FOLDER_MIME_TYPE,
  GOOGLE_FILE_MIME_PREFIX,
  GOOGLE_FILE_REASON,
  RATE_LIMIT_REASONS,
  SIGN_IN_EXPIRED_MESSAGE
} from '../constants/drive-constants'
import {
  httpStatusOf,
  propertyOf,
  RetryableError,
  stringField,
  UploadExpiredError,
  UserError
} from './error-utils'

// A name inside single quotes in a Drive search, with its backslashes and quotes escaped.
export function quoted(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function isGoogleFile(mimeType: string | null | undefined): boolean {
  return (
    typeof mimeType === 'string' &&
    mimeType !== FOLDER_MIME_TYPE &&
    mimeType.startsWith(GOOGLE_FILE_MIME_PREFIX)
  )
}

type ListedFile = drive_v3.Schema$File & { id: string; name: string }

function isListed(file: drive_v3.Schema$File): file is ListedFile {
  return typeof file.id === 'string' && typeof file.name === 'string'
}

export function driveFoldersOf(files: drive_v3.Schema$File[]): FolderEntry[] {
  return files
    .filter(isListed)
    .filter((file) => file.mimeType === FOLDER_MIME_TYPE)
    .map((file) => ({ id: file.id, name: file.name }))
}

// A file's key is its ID. Google Docs and other Google files have no content of their own to download.
export function driveFilesOf(files: drive_v3.Schema$File[]): StoredFile[] {
  return files
    .filter(isListed)
    .filter((file) => file.mimeType !== FOLDER_MIME_TYPE)
    .map((file) => ({
      key: file.id,
      name: file.name,
      size: Number(file.size ?? 0),
      lastModified: file.modifiedTime ?? '',
      storageClass: '',
      access: isGoogleFile(file.mimeType)
        ? { state: 'unavailable', reason: GOOGLE_FILE_REASON }
        : { state: 'available' }
    }))
}

// Drive allows a slash in a name, which a file or folder on this computer can't have.
export function driveSafeName(name: string): string {
  return name.replace(/[/\\]/g, '_')
}

// The bytes a session has, from its Range header, such as "bytes=0-1048575"; none without one.
export function receivedBytes(range: string | null): number {
  const match = range === null ? null : /^bytes=0-(\d+)$/.exec(range)
  return match === null ? 0 : Number(match[1]) + 1
}

// The reason Drive gave for refusing a request, such as storageQuotaExceeded, or ''.
function reasonOf(data: unknown): string {
  const errors = propertyOf(propertyOf(data, 'error'), 'errors')
  return Array.isArray(errors) ? stringField(errors[0], 'reason') : ''
}

// Turns Google's errors into ones the page can show or the queue can retry; anything else passes through.
export function driveErrorOf(error: unknown): unknown {
  if (error instanceof UserError || error instanceof UploadExpiredError) return error
  const data = propertyOf(propertyOf(error, 'response'), 'data')
  const oauthError = propertyOf(data, 'error')
  if (oauthError === 'invalid_client' || oauthError === 'unauthorized_client') {
    return new UserError("Google didn't accept the OAuth client ID and secret.")
  }
  const status = httpStatusOf(error)
  if (oauthError === 'invalid_grant' || status === 401)
    return new UserError(SIGN_IN_EXPIRED_MESSAGE)
  const reason = reasonOf(data)
  if (status === 403 && RATE_LIMIT_REASONS.has(reason)) {
    return new RetryableError('Google Drive is busy.')
  }
  if (status === 403 && reason === 'storageQuotaExceeded') {
    return new UserError('The Google Drive is full.')
  }
  if (status === 403) {
    return new UserError(
      'Google Drive refused access. Check that the signed-in account may use this folder.'
    )
  }
  if (status === 404) {
    return new UserError(
      "Google Drive doesn't have that file or folder, or the signed-in account can't see it."
    )
  }
  return error
}

// An error for an upload session's unexpected answer, shaped like Google's client errors so driveErrorOf reads it.
export async function sessionError(response: Response): Promise<Error> {
  const data: unknown = await response.json().catch(() => null)
  return Object.assign(new Error(`Google Drive answered ${response.status}.`), {
    status: response.status,
    response: { status: response.status, data }
  })
}
