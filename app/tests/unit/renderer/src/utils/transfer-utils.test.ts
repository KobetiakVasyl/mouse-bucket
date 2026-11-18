import { describe, expect, it } from 'vitest'
import type { Transfer, TransferProgress } from '../../../../../src/shared/types/transfer-types'
import {
  cancelLosesData,
  cancelWarning,
  isPending,
  isResumable,
  transferSummary,
  transferTitle,
  transfersOfKind
} from '../../../../../src/renderer/src/utils/transfer-utils'

const transfer = (
  status: Exclude<Transfer['status'], 'failed'> = 'running',
  change: Partial<TransferProgress> = {}
): Transfer => ({
  id: 't1',
  kind: 'upload',
  templateName: 'Reports',
  name: 'report.pdf',
  bytesDone: 512,
  bytesTotal: 2048,
  ...change,
  status
})

describe('isPending', () => {
  it('counts waiting and running transfers only', () => {
    expect(isPending(transfer('queued'))).toBe(true)
    expect(isPending(transfer('running'))).toBe(true)
    expect(isPending(transfer('done'))).toBe(false)
    expect(isPending(transfer('cancelled'))).toBe(false)
  })
})

describe('transferTitle', () => {
  it('names the direction and the file', () => {
    expect(transferTitle(transfer())).toBe('Upload: report.pdf')
    expect(transferTitle(transfer('done', { kind: 'download', name: 'a.zip' }))).toBe(
      'Download: a.zip'
    )
  })
})

describe('transferSummary', () => {
  it('shows the template, status and progress', () => {
    expect(transferSummary(transfer())).toBe('Reports · In progress · 512 bytes of 2.0 KB')
  })

  it('shows only the bytes so far while the size is unknown', () => {
    expect(transferSummary(transfer('queued', { bytesTotal: 0 }))).toBe(
      'Reports · Waiting · 512 bytes'
    )
  })

  it('ends with the error of a failed transfer', () => {
    const failed: Transfer = { ...transfer(), status: 'failed', error: 'The disk is full.' }
    expect(transferSummary(failed)).toBe(
      'Reports · Failed · 512 bytes of 2.0 KB · The disk is full.'
    )
  })
})

describe('transfersOfKind', () => {
  it('keeps the transfers of one direction', () => {
    const upload = transfer()
    const download = transfer('running', { id: 't2', kind: 'download' })
    expect(transfersOfKind([upload, download], 'download')).toEqual([download])
  })
})

describe('pausing, resuming and cancelling', () => {
  it('resumes paused and failed transfers, and pauses pending ones', () => {
    expect(isResumable(transfer('paused'))).toBe(true)
    expect(isResumable({ ...transfer('running'), status: 'failed', error: 'x' })).toBe(true)
    expect(isResumable(transfer('running'))).toBe(false)
    expect(isPending(transfer('retrying'))).toBe(true)
    expect(isPending(transfer('paused'))).toBe(false)
  })

  it('asks before cancelling once something moved, and says what is lost', () => {
    expect(cancelLosesData(transfer('queued', { bytesDone: 0 }))).toBe(false)
    expect(cancelLosesData(transfer('paused', { bytesDone: 1 }))).toBe(true)
    expect(cancelWarning(transfer('paused', { kind: 'download', bytesDone: 2048 }))).toBe(
      "The 2.0 KB downloaded so far is deleted, and the download can't continue later."
    )
    expect(cancelWarning(transfer('paused', { kind: 'upload', bytesDone: 2048 }))).toContain(
      'uploaded so far is deleted from the bucket'
    )
  })
})
