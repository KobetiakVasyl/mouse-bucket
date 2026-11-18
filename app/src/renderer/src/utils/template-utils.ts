// Orders templates by name, splits them into the picker's tiles and its drop-down, and picks them by type. See docs/UI.md.
import type { Template, TemplateKind } from '../../../shared/types/template-types'
import { PICKER_TILES } from '../constants/template-constants'

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

export function templatesOfKind(templates: Template[], kind: TemplateKind): Template[] {
  return templates.filter((template) => template.kind === kind)
}

export function hasKind(templates: Template[], kind: TemplateKind): boolean {
  return templates.some((template) => template.kind === kind)
}
