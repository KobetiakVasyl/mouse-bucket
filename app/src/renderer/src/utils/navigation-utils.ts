// Which page to show: Home when Upload or Browse has no template of its type. See docs/UI.md.
import type { Template } from '../../../shared/types/template-types'
import { REACHED_FROM_HOME } from '../constants/navigation-constants'
import type { Page } from '../types/navigation-types'

export function pageToShow(requested: Page, templates: Template[]): Page {
  const kinds = new Set(templates.map((template) => template.kind))
  if (requested === 'upload' && !kinds.has('upload')) return 'home'
  if (requested === 'download' && !kinds.has('download')) return 'home'
  return requested
}

// Upload and Download are reached from Home, so the menu marks Home while they're open.
export function menuPageOf(page: Page): Page {
  return REACHED_FROM_HOME.has(page) ? 'home' : page
}
