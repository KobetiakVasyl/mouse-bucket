// The messages the page may show for an error; none of them ever includes credentials. See docs/SECURITY.md.
export const ACCESS_DENIED_MESSAGE =
  "Access denied. Check that the IAM user's policy allows this on the bucket."
const NETWORK_MESSAGE =
  "Couldn't reach the storage service. Check the internet connection and try again."
export const REQUEST_REFUSED_MESSAGE = 'Request refused.'
export const NO_ENCRYPTION_MESSAGE =
  "MouseBucket can't store keys securely on this computer, because no keyring is running. " +
  'Start one, such as GNOME Keyring or KWallet, then restart the app.'

// Keyed by the error's name (AWS) or code (Node, Azure).
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
  ['AuthenticationFailed', "Azure didn't accept the storage account key."],
  [
    'AuthorizationFailure',
    'The storage account refused access. Check its firewall and network settings.'
  ],
  ['AuthorizationPermissionMismatch', "The storage account key isn't allowed to do this."],
  ['AccountIsDisabled', 'The storage account is disabled.'],
  ['ContainerNotFound', "The container doesn't exist."],
  ['BlobNotFound', 'The file no longer exists in the container.'],
  ['BlobArchived', 'This file is archived. Restore it before downloading.'],
  ['BlobBeingRehydrated', 'A restore of this file is already in progress.'],
  ['RetryableError', 'The storage service is busy. Try again in a while.'],
  ['UploadExpiredError', 'The unfinished upload expired. Retry to start it over.'],
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

// Errors worth retrying after a wait, by name (AWS) or code (Node, Azure): the network, timeouts and a platform being busy.
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
  'ServiceUnavailable',
  'REQUEST_SEND_ERROR',
  'ServerBusy',
  'OperationTimedOut'
])

// HTTP statuses worth retrying after a wait, besides any 5xx: a timed-out request and throttling.
export const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 429])

// An unknown error's name is shown only when it looks like a plain identifier.
export const ERROR_NAME_PATTERN = /^[A-Za-z0-9]{1,64}$/
