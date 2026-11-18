// Waiting: asking again until the answer is yes, sleeping until a signal aborts, and running a few tasks at a time. See docs/ARCHITECTURE.md.
export async function pollUntil(
  check: () => Promise<boolean>,
  attempts: number,
  delayMs: number
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}

// Waits, unless the signal aborts first, which rejects with an AbortError.
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', stop)
      resolve()
    }, ms)
    const stop = (): void => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', stop, { once: true })
  })
}

// Runs `work` for each item, at most `limit` at a time. After a failure no new item starts, and the first error is thrown once the running ones settle.
export async function forEachLimited<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items]
  const state: { failure: { error: unknown } | null } = { failure: null }
  const worker = async (): Promise<void> => {
    for (
      let item = queue.shift();
      item !== undefined && state.failure === null;
      item = queue.shift()
    ) {
      try {
        await work(item)
      } catch (error) {
        if (state.failure === null) state.failure = { error }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker))
  if (state.failure !== null) throw state.failure.error
}
