import { describe, expect, it } from 'vitest'
import { parseJson, serialize, toJsonFile } from '../../../../src/main/utils/file-utils'

describe('parseJson', () => {
  it('returns undefined for invalid JSON', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 })
    expect(parseJson('{broken')).toBeUndefined()
  })
})

describe('toJsonFile', () => {
  it('indents the JSON and ends it with a newline', () => {
    expect(toJsonFile({ a: 1 })).toBe('{\n  "a": 1\n}\n')
  })
})

describe('serialize', () => {
  it('runs tasks one after another, even when one fails', async () => {
    const run = serialize()
    const order: string[] = []
    const slow = run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      order.push('slow')
    })
    const failing = run(async () => {
      order.push('failing')
      throw new Error('x')
    })
    const last = run(async () => {
      order.push('last')
    })
    await Promise.allSettled([slow, failing, last])
    expect(order).toEqual(['slow', 'failing', 'last'])
    await expect(failing).rejects.toThrow('x')
  })
})
