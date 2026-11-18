import { describe, expect, it } from 'vitest'
import type { Template } from '../../../../../src/shared/types/template-types'
import { PICKER_TILES } from '../../../../../src/renderer/src/constants/template-constants'
import {
  hasKind,
  selectedTemplate,
  sortByName,
  splitForPicker,
  templatesOfKind
} from '../../../../../src/renderer/src/utils/template-utils'

const template = (name: string, kind: Template['kind'] = 'upload'): Template => ({
  id: crypto.randomUUID(),
  name,
  kind,
  bucket: 'b1',
  prefix: '',
  region: 'eu-west-1'
})

describe('sortByName', () => {
  it('sorts by name, ignoring case', () => {
    const names = sortByName([template('beta'), template('Alpha'), template('gamma')]).map(
      (sorted) => sorted.name
    )
    expect(names).toEqual(['Alpha', 'beta', 'gamma'])
  })
})

describe('splitForPicker', () => {
  it('shows up to 10 tiles and puts the rest in the drop-down', () => {
    const many = Array.from({ length: 13 }, (_, index) =>
      template(`T${String(index).padStart(2, '0')}`)
    )
    const { tiles, more } = splitForPicker(many)
    expect(tiles).toHaveLength(PICKER_TILES)
    expect(more.map((rest) => rest.name)).toEqual(['T10', 'T11', 'T12'])
  })

  it('has no drop-down for 10 or fewer', () => {
    expect(splitForPicker([template('A')]).more).toEqual([])
  })
})

describe('selectedTemplate', () => {
  it('finds the template by ID, or falls back to the first by name', () => {
    const [b, a] = [template('B'), template('A')]
    expect(selectedTemplate([b, a], b.id)).toBe(b)
    expect(selectedTemplate([b, a], 'gone')).toBe(a)
  })
})

describe('templatesOfKind and hasKind', () => {
  it('pick the templates of one type', () => {
    const upload = template('Reports')
    const download = template('Archive', 'download')
    expect(templatesOfKind([upload, download], 'download')).toEqual([download])
    expect(hasKind([upload], 'upload')).toBe(true)
    expect(hasKind([upload], 'download')).toBe(false)
  })
})
