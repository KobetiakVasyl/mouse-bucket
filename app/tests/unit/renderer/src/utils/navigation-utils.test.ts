import { describe, expect, it } from 'vitest'
import type { Template } from '../../../../../src/shared/types/template-types'
import { menuPageOf, pageToShow } from '../../../../../src/renderer/src/utils/navigation-utils'

const template = (kind: Template['kind']): Template => ({
  id: crypto.randomUUID(),
  name: kind,
  kind,
  bucket: 'b1',
  prefix: '',
  region: 'eu-west-1'
})

describe('pageToShow', () => {
  it('shows Home instead of Upload or Browse while there are no templates', () => {
    expect(pageToShow('home', [])).toBe('home')
    expect(pageToShow('upload', [])).toBe('home')
    expect(pageToShow('download', [])).toBe('home')
    expect(pageToShow('templates', [])).toBe('templates')
    expect(pageToShow('settings', [])).toBe('settings')
    expect(pageToShow('how-it-works', [])).toBe('how-it-works')
  })

  it('shows Home instead of a page whose template type is missing', () => {
    expect(pageToShow('download', [template('upload')])).toBe('home')
    expect(pageToShow('upload', [template('download')])).toBe('home')
  })

  it('shows the requested page otherwise', () => {
    const templates = [template('upload'), template('download')]
    for (const page of [
      'home',
      'upload',
      'download',
      'templates',
      'how-it-works',
      'settings'
    ] as const) {
      expect(pageToShow(page, templates)).toBe(page)
    }
  })
})

describe('menuPageOf', () => {
  it('marks Home for Upload and Download', () => {
    expect(menuPageOf('upload')).toBe('home')
    expect(menuPageOf('download')).toBe('home')
    expect(menuPageOf('settings')).toBe('settings')
  })
})
