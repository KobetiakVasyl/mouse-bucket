// How many transfers run at once, how often progress reaches the page and is saved, and how retries wait. See docs/ARCHITECTURE.md.
export const TRANSFER_CONCURRENCY = 3
export const PROGRESS_INTERVAL_MS = 200
export const SAVE_INTERVAL_MS = 1000

// The waits before each retry after a network error. The count starts again whenever bytes move.
export const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000, 60_000, 60_000, 60_000, 60_000]
