import { describe, expect, it } from 'vitest'
import { formatBytes } from './format'

describe('formatBytes', () => {
  it('uses the largest fitting unit', () => {
    expect(formatBytes(0)).toBe('0 bytes')
    expect(formatBytes(1023)).toBe('1023 bytes')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB')
    expect(formatBytes(3 * 1024 ** 4)).toBe('3.0 TB')
  })
})
