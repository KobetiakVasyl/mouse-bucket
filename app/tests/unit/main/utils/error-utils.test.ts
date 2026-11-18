import { describe, expect, it } from 'vitest'
import {
  describeError,
  httpStatusOf,
  isRetryable,
  UserError
} from '../../../../src/main/utils/error-utils'

const awsError = (name: string, status: number): Error =>
  Object.assign(new Error('raw AWS message with details'), {
    name,
    $metadata: { httpStatusCode: status }
  })

describe('describeError', () => {
  it('passes user errors through unchanged', () => {
    expect(describeError(new UserError('Pick a template.'))).toBe('Pick a template.')
  })

  it('explains known AWS errors by name', () => {
    expect(describeError(awsError('InvalidAccessKeyId', 403))).toBe(
      "AWS doesn't recognize the access key ID."
    )
    expect(describeError(awsError('NoSuchBucket', 404))).toBe("The bucket doesn't exist.")
  })

  it('explains known Node errors by code', () => {
    expect(describeError(Object.assign(new Error('x'), { code: 'ENOSPC' }))).toBe(
      'The disk is full.'
    )
    expect(describeError(Object.assign(new Error('x'), { code: 'ENOTFOUND' }))).toContain(
      "Couldn't reach the storage service"
    )
  })

  it('treats any other 403 as access denied', () => {
    expect(describeError(awsError('Weird403', 403))).toContain('Access denied')
  })

  it('never repeats the raw message of an unknown error', () => {
    const message = describeError(awsError('SlowDown', 503))
    expect(message).toBe('Something went wrong (SlowDown). Try again.')
    expect(describeError(new Error('secret=abc'))).toBe('Something went wrong. Try again.')
    expect(describeError('a string')).toBe('Something went wrong. Try again.')
  })
})

describe('httpStatusOf', () => {
  it('reads the status of AWS errors, and 0 for anything else', () => {
    expect(httpStatusOf(awsError('X', 404))).toBe(404)
    expect(httpStatusOf(new Error('x'))).toBe(0)
    expect(httpStatusOf(null)).toBe(0)
  })
})

describe('isRetryable', () => {
  it('retries network errors, timeouts and S3 being busy or failing', () => {
    expect(isRetryable(Object.assign(new Error('x'), { code: 'ECONNRESET' }))).toBe(true)
    expect(isRetryable(awsError('SlowDown', 503))).toBe(true)
    expect(isRetryable(awsError('SomethingNew', 500))).toBe(true)
    expect(isRetryable(awsError('TimeoutError', 0))).toBe(true)
  })

  it("doesn't retry what waiting can't fix", () => {
    expect(isRetryable(awsError('AccessDenied', 403))).toBe(false)
    expect(isRetryable(awsError('NoSuchKey', 404))).toBe(false)
    expect(isRetryable(new UserError('That template no longer exists.'))).toBe(false)
    expect(isRetryable('a string')).toBe(false)
  })
})
