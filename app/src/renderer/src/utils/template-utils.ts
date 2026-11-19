// Orders templates by name, splits them into the picker's tiles and its drop-down, picks them by type, and matches
// them to a search. See docs/UI.md.
import type { Template, TemplateKind } from '../../../shared/types/template-types'
import { PLATFORM_LABELS } from '../constants/platform-constants'
import { PICKER_TILES, TEMPLATE_KIND_LABELS } from '../constants/template-constants'
import { templateLocation } from './location-utils'
import { matchesSearch } from './search-utils'

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

// Whether a template matches the Templates search: its name, type, platform, location or S3 region.
export function matchesTemplate(template: Template, query: string): boolean {
  return matchesSearch(
    [
      template.name,
      TEMPLATE_KIND_LABELS[template.kind],
      PLATFORM_LABELS[template.platform],
      templateLocation(template),
      template.platform === 's3' ? template.region : ''
    ],
    query
  )
}
