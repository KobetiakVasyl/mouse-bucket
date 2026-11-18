import { describe, expect, it } from 'vitest'
import { pollUntil } from '../../../../src/main/utils/poll-utils'

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
