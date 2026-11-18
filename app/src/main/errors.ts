// Errors the user may see, and short descriptions of all others that never include credentials. See docs/SECURITY.md.
export class UserError extends Error {
  override readonly name = 'UserError'
}

const ACCESS_DENIED = "Access denied. Check that the IAM user's policy allows this on the bucket."
const NETWORK = "Couldn't reach AWS. Check the internet connection and try again."

// Keyed by the error's name (AWS) or code (Node).
const KNOWN_MESSAGES = new Map([
  ['AbortError', 'Cancelled.'],
  ['AccessDenied', ACCESS_DENIED],
  ['Forbidden', ACCESS_DENIED],
  ['InvalidAccessKeyId', "AWS doesn't recognize the access key ID."],
  ['SignatureDoesNotMatch', "The secret access key doesn't match the access key ID."],
  ['NoSuchBucket', "The bucket doesn't exist."],
  ['NotFound', "The bucket or file doesn't exist."],
  ['NoSuchKey', 'The file no longer exists in the bucket.'],
  ['InvalidObjectState', 'This file is archived. Restore it before downloading.'],
  ['RestoreAlreadyInProgress', 'A restore of this file is already in progress.'],
  ['ObjectAlreadyInActiveTierError', "This file isn't archived, so it doesn't need a restore."],
  ['RequestTimeTooSkewed', "This computer's clock is off. Correct it and try again."],
  ['ENOENT', "The file or folder on this computer doesn't exist anymore."],
  ['EACCES', "This computer didn't allow access to the file."],
  ['EPERM', "This computer didn't allow access to the file."],
  ['EBUSY', 'The file is in use by another program.'],
  ['ENOSPC', 'The disk is full.'],
  ['ENOTFOUND', NETWORK],
  ['EAI_AGAIN', NETWORK],
  ['ECONNREFUSED', NETWORK],
  ['ECONNRESET', NETWORK],
  ['ETIMEDOUT', NETWORK],
  ['EPIPE', NETWORK],
  ['TimeoutError', NETWORK]
])

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
    const message = KNOWN_MESSAGES.get(key)
    if (message !== undefined) return message
  }
  if (httpStatusOf(error) === 403) return ACCESS_DENIED
  const label = /^[A-Za-z0-9]{1,64}$/.test(name) && name !== 'Error' ? ` (${name})` : ''
  return `Something went wrong${label}. Try again.`
}
