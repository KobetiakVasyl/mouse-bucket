import { describe, expect, it, type Mock, vi } from 'vitest'
import { TransferService } from '../../../../src/main/services/transfer-service'
import type {
  DownloadRecord,
  NewTransferRecord,
  TransferRecord,
  TransferRunContext,
  TransferRunner,
  TransferStore
} from '../../../../src/main/types/transfer-queue-types'
import { UserError } from '../../../../src/main/utils/error-utils'
import type { Transfer } from '../../../../src/shared/types/transfer-types'

const TEMPLATE_ID = '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f'
const UPLOAD: NewTransferRecord = {
  kind: 'upload',
  templateId: TEMPLATE_ID,
  templateName: 'Reports',
  place: { platform: 's3', bucket: 'bucket-one', region: 'eu-west-1' },
  key: 'reports/a.bin',
  name: 'a.bin',
  storageClass: 'DEEP_ARCHIVE',
  filePath: '/home/me/a.bin',
  fileSize: 10,
  fileModifiedMs: 1,
  partSize: 8,
  uploadId: null,
  parts: []
}
const DOWNLOAD: Omit<DownloadRecord, 'id'> = {
  kind: 'download',
  templateId: TEMPLATE_ID,
  templateName: 'Archive',
  place: { platform: 's3', bucket: 'bucket-two', region: 'eu-west-1' },
  key: 'b.zip',
  name: 'b.zip',
  targetPath: '/home/me/Downloads/b.zip',
  etag: null,
  bytesTotal: null
}
const networkError = (): Error => Object.assign(new Error('reset'), { code: 'ECONNRESET' })

interface Run {
  record: TransferRecord
  context: TransferRunContext
  finish(): void
  fail(error: unknown): void
}

interface Harness {
  queue: TransferService
  runs: Run[]
  discarded: TransferRecord[]
  saved: TransferRecord[][]
  savedSync: TransferRecord[][]
  keepAwake: { start: Mock<() => void>; stop: Mock<() => void> }
  latest: () => Transfer[]
}

// What a run learns about an upload: here, that S3 started its multipart upload.
const withUploadId = (record: TransferRecord): TransferRecord =>
  record.kind === 'upload' ? { ...record, uploadId: 'upload-1' } : record

function setup(concurrency = 2, retryDelaysMs = [0, 0], stored: TransferRecord[] = []): Harness {
  const runs: Run[] = []
  const discarded: TransferRecord[] = []
  const saved: TransferRecord[][] = []
  const savedSync: TransferRecord[][] = []
  const runner: TransferRunner = {
    run: (record, context) =>
      new Promise<void>((resolve, reject) => {
        runs.push({ record, context, finish: resolve, fail: reject })
        context.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        )
      }),
    discard: async (record) => {
      discarded.push(record)
    },
    bytesDone: async () => 5
  }
  const store: TransferStore = {
    load: async () => stored,
    save: async (records) => {
      saved.push(records)
    },
    saveSync: (records) => {
      savedSync.push(records)
    }
  }
  const keepAwake = { start: vi.fn<() => void>(), stop: vi.fn<() => void>() }
  let snapshot: Transfer[] = []
  const queue = new TransferService({
    concurrency,
    keepAwake,
    runner,
    store,
    progressIntervalMs: 0,
    saveIntervalMs: 0,
    retryDelaysMs,
    onChange: (transfers) => {
      snapshot = transfers
    }
  })
  return { queue, runs, discarded, saved, savedSync, keepAwake, latest: () => snapshot }
}

const statuses = (transfers: Transfer[]): string[] => transfers.map((transfer) => transfer.status)

describe('TransferService', () => {
  it('runs at most `concurrency` transfers at once, in order', async () => {
    const { queue, runs, latest } = setup(1)
    queue.add(UPLOAD)
    queue.add(DOWNLOAD)
    expect(statuses(latest())).toEqual(['running', 'queued'])
    runs[0].finish()
    await vi.waitFor(() => expect(statuses(latest())).toEqual(['done', 'running']))
  })

  it('keeps the computer awake only while transfers are pending', async () => {
    const { queue, runs, keepAwake } = setup()
    queue.add(UPLOAD)
    expect(keepAwake.start).toHaveBeenCalled()
    expect(keepAwake.stop).not.toHaveBeenCalled()
    runs[0].finish()
    await vi.waitFor(() => expect(keepAwake.stop).toHaveBeenCalled())
    expect(queue.active).toBe(false)
  })

  it('reports progress, and the full size once done', async () => {
    const { queue, runs, latest } = setup()
    queue.add(DOWNLOAD)
    expect(latest()[0]).toMatchObject({ name: 'b.zip', bytesTotal: 0 })
    runs[0].context.progress(4, 10)
    await vi.waitFor(() => expect(latest()[0]).toMatchObject({ bytesDone: 4, bytesTotal: 10 }))
    runs[0].finish()
    await vi.waitFor(() => expect(latest()[0]).toMatchObject({ status: 'done', bytesDone: 10 }))
  })

  it('retries a network error after a wait, from the record saved so far', async () => {
    const { queue, runs, latest } = setup()
    queue.add(UPLOAD)
    runs[0].context.save(withUploadId(runs[0].record))
    runs[0].fail(networkError())
    await vi.waitFor(() => expect(runs).toHaveLength(2))
    expect(runs[1].record).toMatchObject({ uploadId: 'upload-1' })
    expect(latest()[0].status).toBe('running')
    runs[1].finish()
    await vi.waitFor(() => expect(latest()[0].status).toBe('done'))
  })

  it('fails with a safe message on other errors, and after the last retry', async () => {
    const { queue, runs, latest } = setup(2, [0])
    queue.add(UPLOAD)
    queue.add(DOWNLOAD)
    runs[0].fail(new UserError('That template no longer exists.'))
    runs[1].fail(networkError())
    await vi.waitFor(() => expect(runs).toHaveLength(3))
    runs[2].fail(networkError())
    await vi.waitFor(() =>
      expect(latest()).toMatchObject([
        { status: 'failed', error: 'That template no longer exists.' },
        {
          status: 'failed',
          error: "Couldn't reach the storage service. Check the internet connection and try again."
        }
      ])
    )
  })

  it('pauses a running transfer and resumes it from its saved record', async () => {
    const { queue, runs, latest, keepAwake } = setup()
    const id = queue.add(UPLOAD)
    runs[0].context.save(withUploadId(runs[0].record))
    queue.pause(id)
    await vi.waitFor(() => expect(latest()[0].status).toBe('paused'))
    expect(keepAwake.stop).toHaveBeenCalled()
    queue.resume(id)
    await vi.waitFor(() => expect(runs).toHaveLength(2))
    expect(runs[1].record).toMatchObject({ uploadId: 'upload-1' })
  })

  it('cancels queued, paused and running transfers, and throws away what they moved', async () => {
    const { queue, runs, discarded, latest } = setup(1)
    const running = queue.add(UPLOAD)
    const queued = queue.add(DOWNLOAD)
    const paused = queue.add({ ...DOWNLOAD, name: 'c.zip' })
    queue.pause(paused)
    queue.cancel(queued)
    queue.cancel(paused)
    queue.cancel(running)
    await vi.waitFor(() =>
      expect(statuses(latest())).toEqual(['cancelled', 'cancelled', 'cancelled'])
    )
    expect(discarded).toHaveLength(3)
    expect(runs).toHaveLength(1)
  })

  it('keeps only unfinished transfers in the store, and brings them back paused', async () => {
    const { queue, runs, saved } = setup()
    queue.add(UPLOAD)
    await vi.waitFor(() => expect(saved.at(-1)).toHaveLength(1))
    runs[0].finish()
    await vi.waitFor(() => expect(saved.at(-1)).toEqual([]))

    const record: TransferRecord = { ...DOWNLOAD, id: 'kept' }
    const restarted = setup(2, [0], [record])
    await restarted.queue.restore()
    expect(restarted.latest()).toMatchObject([{ id: 'kept', status: 'paused', bytesDone: 5 }])
    expect(restarted.runs).toHaveLength(0)
  })

  it('pauses everything and saves at once when the app quits', async () => {
    const { queue, latest, savedSync } = setup(1)
    queue.add(UPLOAD)
    queue.add(DOWNLOAD)
    queue.pauseAll()
    expect(statuses(latest())).toEqual(['paused', 'paused'])
    expect(savedSync.at(-1)).toHaveLength(2)
    expect(queue.active).toBe(false)
  })

  it('names where unfinished downloads will be saved', async () => {
    const { queue, runs } = setup(1)
    queue.add(DOWNLOAD)
    queue.add({ ...DOWNLOAD, targetPath: '/home/me/Downloads/c.zip' })
    expect(queue.downloadTargets()).toEqual([
      '/home/me/Downloads/b.zip',
      '/home/me/Downloads/c.zip'
    ])
    runs[0].finish()
    await vi.waitFor(() => expect(queue.downloadTargets()).toEqual(['/home/me/Downloads/c.zip']))
  })
})
