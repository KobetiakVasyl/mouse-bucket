import { describe, expect, it } from 'vitest'
import { forEachLimited, pollUntil, sleep } from '../../../../src/main/utils/poll-utils'

describe('pollUntil', () => {
  it('passes as soon as the answer is yes', async () => {
    let calls = 0
    expect(await pollUntil(async () => ++calls >= 3, 5, 0)).toBe(true)
    expect(calls).toBe(3)
  })

  it('gives up after the last attempt', async () => {
    let calls = 0
    const check = async (): Promise<boolean> => {
      calls++
      return false
    }
    expect(await pollUntil(check, 4, 0)).toBe(false)
    expect(calls).toBe(4)
  })
})

describe('sleep', () => {
  it('waits, or stops at once when the signal aborts', async () => {
    await sleep(0, new AbortController().signal)
    const controller = new AbortController()
    const waiting = sleep(60_000, controller.signal)
    controller.abort()
    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('forEachLimited', () => {
  it('runs at most `limit` at a time and handles every item', async () => {
    let running = 0
    let most = 0
    const done: number[] = []
    await forEachLimited([1, 2, 3, 4, 5], 2, async (item) => {
      running++
      most = Math.max(most, running)
      await new Promise((resolve) => setTimeout(resolve, 5))
      done.push(item)
      running--
    })
    expect(most).toBe(2)
    expect(done.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('starts nothing new after a failure, and throws the first error', async () => {
    const started: number[] = []
    const run = forEachLimited([1, 2, 3, 4], 1, async (item) => {
      started.push(item)
      if (item === 2) throw new Error('part 2 failed')
    })
    await expect(run).rejects.toThrow('part 2 failed')
    expect(started).toEqual([1, 2])
  })
})
