// The messages the page may show for an error; none of them ever includes credentials. See docs/SECURITY.md.
export const ACCESS_DENIED_MESSAGE =
  "Access denied. Check that the IAM user's policy allows this on the bucket."
const NETWORK_MESSAGE = "Couldn't reach AWS. Check the internet connection and try again."
export const REQUEST_REFUSED_MESSAGE = 'Request refused.'
export const NO_ENCRYPTION_MESSAGE =
  "MouseBucket can't store keys securely on this computer, because no keyring is running. " +
  'Start one, such as GNOME Keyring or KWallet, then restart the app.'

// Keyed by the error's name (AWS) or code (Node).
export const KNOWN_ERROR_MESSAGES: ReadonlyMap<string, string> = new Map([
  ['AbortError', 'Cancelled.'],
  ['AccessDenied', ACCESS_DENIED_MESSAGE],
  ['Forbidden', ACCESS_DENIED_MESSAGE],
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
  ['ENOTFOUND', NETWORK_MESSAGE],
  ['EAI_AGAIN', NETWORK_MESSAGE],
  ['ECONNREFUSED', NETWORK_MESSAGE],
  ['ECONNRESET', NETWORK_MESSAGE],
  ['ETIMEDOUT', NETWORK_MESSAGE],
  ['EPIPE', NETWORK_MESSAGE],
  ['TimeoutError', NETWORK_MESSAGE]
])

// Errors worth retrying after a wait, by name (AWS) or code (Node): the network, timeouts and S3 being busy.
export const RETRYABLE_ERRORS: ReadonlySet<string> = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENETUNREACH',
  'ENETDOWN',
  'EHOSTUNREACH',
  'TimeoutError',
  'RequestTimeout',
  'SlowDown',
  'InternalError',
  'ServiceUnavailable'
])

// An unknown error's name is shown only when it looks like a plain identifier.
export const ERROR_NAME_PATTERN = /^[A-Za-z0-9]{1,64}$/
