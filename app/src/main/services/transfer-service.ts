// Runs uploads and downloads a few at a time, reports progress, and keeps the computer awake while any are pending. See docs/ARCHITECTURE.md.
import { randomUUID } from 'node:crypto'
import type { Transfer, TransferDetails } from '../../shared/types/transfer-types'
import { PENDING_STATUSES } from '../../shared/constants/transfer-constants'
import type { TransferJob, TransferQueueOptions, TransferTask } from '../types/transfer-queue-types'
import { describeError } from '../utils/error-utils'

export class TransferService {
  private readonly jobs = new Map<string, TransferJob>()
  private running = 0
  private progressTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: TransferQueueOptions) {}

  get active(): boolean {
    return [...this.jobs.values()].some((job) => PENDING_STATUSES.has(job.transfer.status))
  }

  add(details: TransferDetails, task: TransferTask): string {
    const id = randomUUID()
    this.jobs.set(id, {
      transfer: { ...details, id, bytesDone: 0, status: 'queued' },
      task,
      controller: new AbortController()
    })
    this.options.keepAwake.start()
    this.changed()
    this.pump()
    return id
  }

  list(): Transfer[] {
    return [...this.jobs.values()].map((job) => ({ ...job.transfer }))
  }

  cancel(id: string): void {
    const job = this.jobs.get(id)
    if (job === undefined) return
    if (job.transfer.status === 'queued') {
      job.transfer = { ...job.transfer, status: 'cancelled' }
      this.changed()
      this.settle()
    } else if (job.transfer.status === 'running') {
      job.controller.abort()
    }
  }

  cancelAll(): void {
    for (const id of this.jobs.keys()) this.cancel(id)
  }

  private pump(): void {
    for (const job of this.jobs.values()) {
      if (this.running >= this.options.concurrency) return
      if (job.transfer.status === 'queued') void this.run(job)
    }
  }

  private async run(job: TransferJob): Promise<void> {
    this.running++
    job.transfer = { ...job.transfer, status: 'running' }
    this.changed()
    try {
      await job.task({
        signal: job.controller.signal,
        progress: (bytesDone, bytesTotal) => {
          job.transfer = { ...job.transfer, bytesDone, bytesTotal }
          this.progressed()
        }
      })
      job.transfer = { ...job.transfer, status: 'done', bytesDone: job.transfer.bytesTotal }
    } catch (error) {
      job.transfer = job.controller.signal.aborted
        ? { ...job.transfer, status: 'cancelled' }
        : { ...job.transfer, status: 'failed', error: describeError(error) }
    } finally {
      this.running--
      this.changed()
      this.pump()
      this.settle()
    }
  }

  private settle(): void {
    if (!this.active) this.options.keepAwake.stop()
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
