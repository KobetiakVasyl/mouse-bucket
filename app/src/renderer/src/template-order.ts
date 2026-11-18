// Orders templates by name and splits them into the picker's tiles and its drop-down. See docs/UI.md.
import type { Template } from '../../shared/ipc'

export const PICKER_TILES = 10

export function sortByName(templates: Template[]): Template[] {
  return [...templates].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  )
}

export function splitForPicker(templates: Template[]): { tiles: Template[]; more: Template[] } {
  const sorted = sortByName(templates)
  return { tiles: sorted.slice(0, PICKER_TILES), more: sorted.slice(PICKER_TILES) }
}

// The template with this ID, or the first one when it's gone. `templates` is never empty.
export function selectedTemplate(templates: Template[], id: string): Template {
  const found = templates.find((template) => template.id === id)
  return found === undefined ? sortByName(templates)[0] : found
}
