import { describe, expect, it } from 'vitest'
import type { Template } from '../../shared/ipc'
import { PICKER_TILES, selectedTemplate, sortByName, splitForPicker } from './template-order'

const template = (name: string): Template => ({
  id: crypto.randomUUID(),
  name,
  kind: 'upload',
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
