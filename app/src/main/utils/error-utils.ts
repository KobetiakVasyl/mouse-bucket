// Errors the user may see, and short descriptions of all others that never include credentials. See docs/SECURITY.md.
import {
  ACCESS_DENIED_MESSAGE,
  ERROR_NAME_PATTERN,
  KNOWN_ERROR_MESSAGES,
  RETRYABLE_ERRORS
} from '../constants/error-constants'

export class UserError extends Error {
  override readonly name = 'UserError'
}

// The named property of an object, or undefined for anything that isn't one.
export function propertyOf(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined
}

// The named string field of an error-like value, or '' when it has none.
function stringField(error: unknown, field: string): string {
  const value = propertyOf(error, field)
  return typeof value === 'string' ? value : ''
}

// The HTTP status of an AWS error, or 0 when it has none.
export function httpStatusOf(error: unknown): number {
  const status = propertyOf(propertyOf(error, '$metadata'), 'httpStatusCode')
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

// Whether trying again later may work: network errors, timeouts, and S3's 5xx answers.
export function isRetryable(error: unknown): boolean {
  if (error instanceof UserError) return false
  if (RETRYABLE_ERRORS.has(stringField(error, 'name'))) return true
  if (RETRYABLE_ERRORS.has(stringField(error, 'code'))) return true
  return httpStatusOf(error) >= 500
}
