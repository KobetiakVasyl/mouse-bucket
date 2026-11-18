import { describe, expect, it } from 'vitest'
import {
  driveErrorOf,
  driveFilesOf,
  driveFoldersOf,
  isGoogleFile,
  quoted,
  receivedBytes,
  sessionError
} from '../../../../src/main/utils/drive-utils'
import {
  RetryableError,
  UploadExpiredError,
  UserError
} from '../../../../src/main/utils/error-utils'

const googleError = (status: number, data: unknown): Error =>
  Object.assign(new Error('raw'), { status, response: { status, data } })

describe('quoted', () => {
  it("escapes backslashes and quotes inside a search's quotes", () => {
    expect(quoted("Tom's \\ photos")).toBe("'Tom\\'s \\\\ photos'")
  })
})

describe('driveFoldersOf and driveFilesOf', () => {
  const listed = [
    { id: 'f1', name: 'Photos', mimeType: 'application/vnd.google-apps.folder' },
    {
      id: 'x1',
      name: 'a.zip',
      mimeType: 'application/zip',
      size: '12',
      modifiedTime: '2026-11-01T10:00:00.000Z'
    },
    { id: 'd1', name: 'Notes', mimeType: 'application/vnd.google-apps.document' },
    { name: 'no id' }
  ]

  it('split folders from files, keyed by ID, and mark Google files as unavailable', () => {
    expect(driveFoldersOf(listed)).toEqual([{ id: 'f1', name: 'Photos' }])
    expect(driveFilesOf(listed)).toEqual([
      {
        key: 'x1',
        name: 'a.zip',
        size: 12,
        lastModified: '2026-11-01T10:00:00.000Z',
        storageClass: '',
        access: { state: 'available' }
      },
      {
        key: 'd1',
        name: 'Notes',
        size: 0,
        lastModified: '',
        storageClass: '',
        access: { state: 'unavailable', reason: expect.stringContaining('Google Docs') }
      }
    ])
    expect(isGoogleFile('application/vnd.google-apps.folder')).toBe(false)
    expect(isGoogleFile(undefined)).toBe(false)
  })
})

describe('receivedBytes', () => {
  it("reads how much of an upload Drive has from the session's Range header", () => {
    expect(receivedBytes('bytes=0-1048575')).toBe(1_048_576)
    expect(receivedBytes(null)).toBe(0)
    expect(receivedBytes('nonsense')).toBe(0)
  })
})

describe('driveErrorOf', () => {
  it('explains a lost sign-in or a wrong client, and never repeats the raw message', () => {
    const expired = driveErrorOf(googleError(400, { error: 'invalid_grant' }))
    expect(expired).toBeInstanceOf(UserError)
    expect((expired as Error).message).toContain('sign-in')
    expect((driveErrorOf(googleError(401, {})) as Error).message).toContain('sign-in')
    expect((driveErrorOf(googleError(401, { error: 'invalid_client' })) as Error).message).toBe(
      "Google didn't accept the OAuth client ID and secret."
    )
  })

  it('retries rate limits, and explains a full Drive, a refusal and a missing file', () => {
    const reasons = (reason: string): unknown => ({ error: { errors: [{ reason }] } })
    expect(driveErrorOf(googleError(403, reasons('userRateLimitExceeded')))).toBeInstanceOf(
      RetryableError
    )
    expect((driveErrorOf(googleError(403, reasons('storageQuotaExceeded'))) as Error).message).toBe(
      'The Google Drive is full.'
    )
    expect((driveErrorOf(googleError(403, {})) as Error).message).toContain('refused access')
    expect((driveErrorOf(googleError(404, {})) as Error).message).toContain("doesn't have")
  })

  it('passes through errors it knows nothing about, and its own', () => {
    const network = Object.assign(new Error('reset'), { code: 'ECONNRESET' })
    expect(driveErrorOf(network)).toBe(network)
    const expired = new UploadExpiredError()
    expect(driveErrorOf(expired)).toBe(expired)
  })
})

describe('sessionError', () => {
  it("shapes a session's answer like Google's client errors", async () => {
    const response = new Response(JSON.stringify({ error: { errors: [{ reason: 'x' }] } }), {
      status: 503
    })
    expect(await sessionError(response)).toMatchObject({
      status: 503,
      response: { status: 503, data: { error: { errors: [{ reason: 'x' }] } } }
    })
  })
})
