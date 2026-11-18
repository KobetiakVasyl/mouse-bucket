import { describe, expect, it, vi } from 'vitest'
import type { Transfer, TransferDetails } from '../shared/ipc'
import { UserError } from './errors'
import { type TransferContext, TransferQueue } from './transfers'

const DETAILS: TransferDetails = { kind: 'upload', templateName: 'T', name: 'f', bytesTotal: 10 }

function setup(concurrency = 2): {
  queue: TransferQueue
  keepAwake: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }
  latest: () => Transfer[]
} {
  const keepAwake = { start: vi.fn(), stop: vi.fn() }
  let snapshot: Transfer[] = []
  const queue = new TransferQueue({
    concurrency,
    keepAwake,
    progressIntervalMs: 0,
    onChange: (transfers) => {
      snapshot = transfers
    }
  })
  return { queue, keepAwake, latest: () => snapshot }
}

// A task that waits until the test lets it finish, or is cancelled.
function controllable(): {
  task: (context: TransferContext) => Promise<void>
  finish: () => void
  context: () => TransferContext
} {
  let finish = (): void => undefined
  let captured: TransferContext | null = null
  return {
    task: (context) =>
      new Promise<void>((resolve, reject) => {
        captured = context
        finish = resolve
        context.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        )
      }),
    finish: () => finish(),
    context: () => {
      if (captured === null) throw new Error('The task has not started.')
      return captured
    }
  }
}

const statuses = (transfers: Transfer[]): string[] => transfers.map((transfer) => transfer.status)

describe('TransferQueue', () => {
  it('runs at most `concurrency` transfers at once, in order', async () => {
    const { queue, latest } = setup(1)
    const first = controllable()
    const second = controllable()
    queue.add(DETAILS, first.task)
    queue.add(DETAILS, second.task)
    expect(statuses(latest())).toEqual(['running', 'queued'])
    first.finish()
    await vi.waitFor(() => expect(statuses(latest())).toEqual(['done', 'running']))
  })

  it('keeps the computer awake only while transfers are pending', async () => {
    const { queue, keepAwake } = setup()
    const job = controllable()
    queue.add(DETAILS, job.task)
    expect(keepAwake.start).toHaveBeenCalled()
    expect(keepAwake.stop).not.toHaveBeenCalled()
    job.finish()
    await vi.waitFor(() => expect(keepAwake.stop).toHaveBeenCalled())
    expect(queue.active).toBe(false)
  })

  it('reports progress, and the full size once done', async () => {
    const { queue, latest } = setup()
    const job = controllable()
    queue.add({ ...DETAILS, bytesTotal: 0 }, job.task)
    job.context().progress(4, 10)
    await vi.waitFor(() => expect(latest()[0]).toMatchObject({ bytesDone: 4, bytesTotal: 10 }))
    job.finish()
    await vi.waitFor(() => expect(latest()[0]).toMatchObject({ status: 'done', bytesDone: 10 }))
  })

  it('marks a failed transfer with a safe message', async () => {
    const { queue, latest } = setup()
    queue.add(DETAILS, async () => {
      throw new UserError('That template no longer exists.')
    })
    await vi.waitFor(() =>
      expect(latest()[0]).toMatchObject({
        status: 'failed',
        error: 'That template no longer exists.'
      })
    )
  })

  it('cancels queued and running transfers', async () => {
    const { queue, latest } = setup(1)
    const running = controllable()
    const runningId = queue.add(DETAILS, running.task)
    const queuedId = queue.add(DETAILS, controllable().task)
    queue.cancel(queuedId)
    queue.cancel(runningId)
    await vi.waitFor(() => expect(statuses(latest())).toEqual(['cancelled', 'cancelled']))
  })
})
