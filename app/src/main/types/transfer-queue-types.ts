// What the transfer queue runs, what it reports progress to, and what it needs to keep the computer awake. See docs/ARCHITECTURE.md.
import type { Transfer } from '../../shared/types/transfer-types'

export interface TransferContext {
  signal: AbortSignal
  progress(bytesDone: number, bytesTotal: number): void
}

export type TransferTask = (context: TransferContext) => Promise<void>

export interface TransferJob {
  transfer: Transfer
  task: TransferTask
  controller: AbortController
}

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

// The parts of Electron's powerSaveBlocker that keep the computer awake.
export interface SleepBlocker {
  start(type: 'prevent-app-suspension'): number
  stop(id: number): boolean
}
