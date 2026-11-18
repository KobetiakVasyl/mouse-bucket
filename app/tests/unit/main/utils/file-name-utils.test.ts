import { describe, expect, it } from 'vitest'
import { saveNameFor } from '../../../../src/main/utils/file-name-utils'

describe('saveNameFor', () => {
  it('uses the last part of the key', () => {
    expect(saveNameFor('reports/2026/summary.pdf')).toBe('summary.pdf')
    expect(saveNameFor('summary.pdf')).toBe('summary.pdf')
  })

  it('replaces characters Windows forbids', () => {
    expect(saveNameFor('a/b:c*d?.txt')).toBe('b_c_d_.txt')
    expect(saveNameFor('a/tab\there.txt')).toBe('tab_here.txt')
  })

  it('avoids reserved Windows names and trailing dots or spaces', () => {
    expect(saveNameFor('CON')).toBe('_CON')
    expect(saveNameFor('x/nul.tar.gz')).toBe('_nul.tar.gz')
    expect(saveNameFor('notes. . ')).toBe('notes')
  })

  it('falls back to "download" when nothing usable is left', () => {
    expect(saveNameFor('')).toBe('download')
    expect(saveNameFor('/')).toBe('download')
    expect(saveNameFor('...')).toBe('download')
  })
})
