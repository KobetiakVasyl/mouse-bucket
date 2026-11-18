import { describe, expect, it } from 'vitest'
import { numberedName, saveNameFor } from '../../../../src/main/utils/file-name-utils'

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

describe('numberedName', () => {
  it('puts the number before the extension', () => {
    expect(numberedName('report.pdf', 1)).toBe('report.pdf')
    expect(numberedName('report.pdf', 2)).toBe('report (2).pdf')
    expect(numberedName('backup.tar.gz', 3)).toBe('backup (3).tar.gz')
    expect(numberedName('my.notes.txt', 2)).toBe('my.notes (2).txt')
  })

  it('adds it at the end of a name without an extension', () => {
    expect(numberedName('README', 2)).toBe('README (2)')
    expect(numberedName('.bashrc', 2)).toBe('.bashrc (2)')
  })
})
