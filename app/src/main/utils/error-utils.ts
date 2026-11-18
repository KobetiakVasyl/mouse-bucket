// Errors the user may see, and short descriptions of all others that never include credentials. See docs/SECURITY.md.
import {
  ACCESS_DENIED_MESSAGE,
  ERROR_NAME_PATTERN,
  KNOWN_ERROR_MESSAGES,
  RETRYABLE_ERRORS,
  RETRYABLE_STATUSES
} from '../constants/error-constants'

export class UserError extends Error {
  override readonly name = 'UserError'
}

// The platform no longer has an unfinished upload, such as an S3 multipart upload a lifecycle rule removed, or a Google
// Drive session older than a week, so the upload starts over.
export class UploadExpiredError extends Error {
  override readonly name = 'UploadExpiredError'
}

// The platform is busy, such as Google Drive's rate limit, so trying again later may work.
export class RetryableError extends Error {
  override readonly name = 'RetryableError'
}

// The named property of an object, or undefined for anything that isn't one.
export function propertyOf(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined
}

// The named string field of an error-like value, or '' when it has none.
export function stringField(error: unknown, field: string): string {
  const value = propertyOf(error, field)
  return typeof value === 'string' ? value : ''
}

// The HTTP status of a platform's error, or 0 when it has none: AWS puts it in $metadata, Azure in statusCode, and
// Google's client in status or its response.
export function httpStatusOf(error: unknown): number {
  const candidates = [
    propertyOf(propertyOf(error, '$metadata'), 'httpStatusCode'),
    propertyOf(error, 'statusCode'),
    propertyOf(error, 'status'),
    propertyOf(propertyOf(error, 'response'), 'status')
  ]
  const status = candidates.find((candidate) => typeof candidate === 'number')
  return typeof status === 'number' ? status : 0
}

export function describeError(error: unknown): string {
  if (error instanceof UserError) return error.message
  const name = stringField(error, 'name')
  for (const key of [name, stringField(error, 'code')]) {
    const message = KNOWN_ERROR_MESSAGES.get(key)
    if (message !== undefined) return message
  }
  if (httpStatusOf(error) === 403) return ACCESS_DENIED_MESSAGE
  const label = ERROR_NAME_PATTERN.test(name) && name !== 'Error' ? ` (${name})` : ''
  return `Something went wrong${label}. Try again.`
}

// Whether trying again later may work: network errors, timeouts, throttling, and a platform's 5xx answers.
export function isRetryable(error: unknown): boolean {
  if (error instanceof UserError || error instanceof UploadExpiredError) return false
  if (error instanceof RetryableError) return true
  if (RETRYABLE_ERRORS.has(stringField(error, 'name'))) return true
  if (RETRYABLE_ERRORS.has(stringField(error, 'code'))) return true
  const status = httpStatusOf(error)
  return status >= 500 || RETRYABLE_STATUSES.has(status)
}
