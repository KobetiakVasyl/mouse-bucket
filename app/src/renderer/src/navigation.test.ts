import { describe, expect, it } from 'vitest'
import type { Template } from '../../shared/ipc'
import { menuPageOf, pageToShow } from './navigation'

const template = (kind: Template['kind']): Template => ({
  id: crypto.randomUUID(),
  name: kind,
  kind,
  bucket: 'b1',
  prefix: '',
  region: 'eu-west-1'
})

describe('pageToShow', () => {
  it('shows Templates instead of any page that needs a template, while there are none', () => {
    for (const page of ['home', 'upload', 'download'] as const) {
      expect(pageToShow(page, [])).toBe('templates')
    }
    expect(pageToShow('settings', [])).toBe('settings')
  })

  it('shows Home instead of a page whose template type is missing', () => {
    expect(pageToShow('download', [template('upload')])).toBe('home')
    expect(pageToShow('upload', [template('download')])).toBe('home')
  })

  it('shows the requested page otherwise', () => {
    const templates = [template('upload'), template('download')]
    for (const page of ['home', 'upload', 'download', 'templates', 'settings'] as const) {
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
