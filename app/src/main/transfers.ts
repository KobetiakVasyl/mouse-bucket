// Runs uploads and downloads a few at a time, reports progress, and keeps the computer awake while any are pending. See docs/ARCHITECTURE.md.
import { randomUUID } from 'node:crypto'
import type { Transfer, TransferDetails, TransferStatus } from '../shared/ipc'
import { describeError } from './errors'

export interface TransferContext {
  signal: AbortSignal
  progress(bytesDone: number, bytesTotal: number): void
}

export type TransferTask = (context: TransferContext) => Promise<void>

export interface KeepAwake {
  start(): void
  stop(): void
}

export interface TransferQueueOptions {
  concurrency: number
  keepAwake: KeepAwake
  onChange(transfers: Transfer[]): void
  // Progress reaches onChange at most this often, so many small chunks don't flood the renderer.
  progressIntervalMs: number
}

interface Job {
  transfer: Transfer
  task: TransferTask
  controller: AbortController
}

export class TransferQueue {
  private readonly jobs = new Map<string, Job>()
  private running = 0
  private progressTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: TransferQueueOptions) {}

  get active(): boolean {
    return [...this.jobs.values()].some((job) => isPending(job.transfer))
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

  private async run(job: Job): Promise<void> {
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

const PENDING: ReadonlySet<TransferStatus> = new Set(['queued', 'running'])

function isPending(transfer: Transfer): boolean {
  return PENDING.has(transfer.status)
}
