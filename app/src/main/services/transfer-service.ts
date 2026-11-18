// Runs uploads and downloads a few at a time, retries network errors, pauses and resumes them, keeps the unfinished
// ones across restarts, and keeps the computer awake while any are pending. See docs/ARCHITECTURE.md.
import { randomUUID } from 'node:crypto'
import { PENDING_STATUSES, RESUMABLE_STATUSES } from '../../shared/constants/transfer-constants'
import type { Transfer, TransferStatus } from '../../shared/types/transfer-types'
import type {
  NewTransferRecord,
  TransferJob,
  TransferQueueOptions,
  TransferRecord
} from '../types/transfer-queue-types'
import { describeError, isRetryable } from '../utils/error-utils'
import { sleep } from '../utils/poll-utils'
import { transferDetailsOf } from '../utils/transfer-utils'

export class TransferService {
  private readonly jobs = new Map<string, TransferJob>()
  private running = 0
  private progressTimer: ReturnType<typeof setTimeout> | null = null
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: TransferQueueOptions) {}

  get active(): boolean {
    return [...this.jobs.values()].some((job) => PENDING_STATUSES.has(job.transfer.status))
  }

  // Brings back the transfers that hadn't finished when the app last closed, paused until resumed.
  async restore(): Promise<void> {
    for (const record of await this.options.store.load()) {
      const bytesDone = await this.options.runner.bytesDone(record).catch(() => 0)
      this.jobs.set(record.id, {
        record,
        transfer: { ...transferDetailsOf(record), id: record.id, bytesDone, status: 'paused' },
        controller: null,
        stopReason: null
      })
    }
    this.changed()
  }

  add(newRecord: NewTransferRecord): string {
    const id = randomUUID()
    const record: TransferRecord = { ...newRecord, id }
    this.jobs.set(id, {
      record,
      transfer: { ...transferDetailsOf(record), id, bytesDone: 0, status: 'queued' },
      controller: null,
      stopReason: null
    })
    this.scheduleSave()
    this.options.keepAwake.start()
    this.changed()
    this.pump()
    return id
  }

  list(): Transfer[] {
    return [...this.jobs.values()].map((job) => ({ ...job.transfer }))
  }

  // Where every unfinished download will be saved, so a new download picks another name.
  downloadTargets(): string[] {
    return [...this.jobs.values()].flatMap((job) =>
      job.record.kind === 'download' && this.unfinished(job) ? [job.record.targetPath] : []
    )
  }

  pause(id: string): void {
    const job = this.jobs.get(id)
    if (job === undefined) return
    if (job.controller !== null) {
      job.stopReason = 'pause'
      job.controller.abort()
    } else if (job.transfer.status === 'queued') {
      this.setStatus(job, 'paused')
      this.changed()
      this.settle()
    }
  }

  resume(id: string): void {
    const job = this.jobs.get(id)
    if (job === undefined || !RESUMABLE_STATUSES.has(job.transfer.status)) return
    this.setStatus(job, 'queued')
    this.options.keepAwake.start()
    this.changed()
    this.pump()
  }

  // Stops the transfer and throws away what it moved: a download's .part file, or an upload's parts in S3.
  cancel(id: string): void {
    const job = this.jobs.get(id)
    if (job === undefined || !this.unfinished(job)) return
    if (job.controller !== null) {
      job.stopReason = 'cancel'
      job.controller.abort()
      return
    }
    void this.options.runner.discard(job.record).catch(() => undefined)
    this.finish(job, 'cancelled')
    this.changed()
    this.settle()
  }

  // Pauses every pending transfer at once and saves them, because the app is about to quit.
  pauseAll(): void {
    for (const job of this.jobs.values()) {
      if (!PENDING_STATUSES.has(job.transfer.status)) continue
      if (job.controller !== null) {
        job.stopReason = 'pause'
        job.controller.abort()
      }
      this.setStatus(job, 'paused')
    }
    if (this.saveTimer !== null) clearTimeout(this.saveTimer)
    this.saveTimer = null
    this.options.store.saveSync(this.records())
    this.changed()
    this.settle()
  }

  private pump(): void {
    for (const job of this.jobs.values()) {
      if (this.running >= this.options.concurrency) return
      if (job.transfer.status === 'queued') void this.run(job)
    }
  }

  // Runs until done, retrying network errors after a wait. The count of retries starts again whenever bytes move.
  private async run(job: TransferJob): Promise<void> {
    this.running++
    const controller = new AbortController()
    job.controller = controller
    job.stopReason = null
    this.setStatus(job, 'running')
    this.changed()
    let failures = 0
    let bytesAtFailure = 0
    try {
      for (;;) {
        try {
          await this.options.runner.run(job.record, {
            signal: controller.signal,
            progress: (bytesDone, bytesTotal) => {
              job.transfer = { ...job.transfer, bytesDone, bytesTotal }
              if (bytesDone > bytesAtFailure) failures = 0
              this.progressed()
            },
            save: (record) => {
              job.record = record
              this.scheduleSave()
            }
          })
          job.transfer = { ...job.transfer, bytesDone: job.transfer.bytesTotal }
          this.finish(job, 'done')
          return
        } catch (error) {
          if (controller.signal.aborted) throw error
          if (!isRetryable(error) || failures >= this.options.retryDelaysMs.length) {
            job.transfer = { ...job.transfer, status: 'failed', error: describeError(error) }
            return
          }
          bytesAtFailure = job.transfer.bytesDone
          this.setStatus(job, 'retrying')
          this.changed()
          await sleep(this.options.retryDelaysMs[failures++], controller.signal)
          this.setStatus(job, 'running')
          this.changed()
        }
      }
    } catch {
      if (job.stopReason === 'cancel') {
        await this.options.runner.discard(job.record).catch(() => undefined)
        this.finish(job, 'cancelled')
      } else {
        this.setStatus(job, 'paused')
      }
    } finally {
      job.controller = null
      job.stopReason = null
      this.running--
      this.scheduleSave()
      this.changed()
      this.pump()
      this.settle()
    }
  }

  private unfinished(job: TransferJob): boolean {
    return job.transfer.status !== 'done' && job.transfer.status !== 'cancelled'
  }

  // The records of the transfers that can still resume; finished and cancelled ones aren't kept.
  private records(): TransferRecord[] {
    return [...this.jobs.values()].filter((job) => this.unfinished(job)).map((job) => job.record)
  }

  private setStatus(job: TransferJob, status: Exclude<TransferStatus, 'failed'>): void {
    const { id, kind, templateName, name, bytesTotal, bytesDone } = job.transfer
    job.transfer = { id, kind, templateName, name, bytesTotal, bytesDone, status }
  }

  private finish(job: TransferJob, status: 'done' | 'cancelled'): void {
    this.setStatus(job, status)
    this.scheduleSave()
  }

  private settle(): void {
    if (!this.active) this.options.keepAwake.stop()
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.options.store.save(this.records()).catch((error: unknown) => {
        console.error("The transfers couldn't be saved:", describeError(error))
      })
    }, this.options.saveIntervalMs)
  }

  private changed(): void {
    if (this.progressTimer !== null) clearTimeout(this.progressTimer)
    this.progressTimer = null
    this.options.onChange(this.list())
  }

  private progressed(): void {
    if (this.progressTimer !== null) return
    this.progressTimer = setTimeout(() => {
      this.progressTimer = null
      this.options.onChange(this.list())
    }, this.options.progressIntervalMs)
  }
}
