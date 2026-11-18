// What the transfer queue keeps of each transfer so it can resume, what runs it, and what it needs to keep the computer awake. See docs/ARCHITECTURE.md.
import type { z } from 'zod'
import type { Transfer } from '../../shared/types/transfer-types'
import type {
  DownloadRecordSchema,
  UploadPartSchema,
  UploadRecordSchema
} from '../validation/data-file-validation'

// A download, enough to resume it: the file's version and size are known once it starts.
export type DownloadRecord = z.infer<typeof DownloadRecordSchema>

// One part the platform confirmed of an upload.
export type UploadPart = z.infer<typeof UploadPartSchema>

// An upload, enough to resume it: the platform's handle on it and the parts the platform already has.
export type UploadRecord = z.infer<typeof UploadRecordSchema>

export type TransferRecord = DownloadRecord | UploadRecord

export type NewTransferRecord = Omit<DownloadRecord, 'id'> | Omit<UploadRecord, 'id'>

export interface TransferRunContext {
  signal: AbortSignal
  progress(bytesDone: number, bytesTotal: number): void
  // Keeps what the run learned, such as the file's version or a confirmed part, so a later run can resume from it.
  save(record: TransferRecord): void
}

// Runs a transfer, from where it stopped, and throws away what it moved when it's cancelled.
export interface TransferRunner {
  run(record: TransferRecord, context: TransferRunContext): Promise<void>
  discard(record: TransferRecord): Promise<void>
  bytesDone(record: TransferRecord): Promise<number>
}

export interface TransferStore {
  load(): Promise<TransferRecord[]>
  save(records: TransferRecord[]): Promise<void>
  saveSync(records: TransferRecord[]): void
}

// Why a running transfer was stopped.
export type StopReason = 'pause' | 'cancel'

export interface TransferJob {
  record: TransferRecord
  transfer: Transfer
  controller: AbortController | null
  stopReason: StopReason | null
}

export interface KeepAwake {
  start(): void
  stop(): void
}

export interface TransferQueueOptions {
  concurrency: number
  keepAwake: KeepAwake
  runner: TransferRunner
  store: TransferStore
  onChange(transfers: Transfer[]): void
  // Progress reaches onChange at most this often, so many small chunks don't flood the renderer.
  progressIntervalMs: number
  // Records are saved at most this often while transfers run.
  saveIntervalMs: number
  // The wait before each retry after a network error.
  retryDelaysMs: number[]
}

// The parts of Electron's powerSaveBlocker that keep the computer awake.
export interface SleepBlocker {
  start(type: 'prevent-app-suspension'): number
  stop(id: number): boolean
}
