// Which page to show: Templates while nothing is set up, Home when a page's template type is missing. See docs/UI.md.
import type { Template } from '../../../shared/types/template-types'
import { NEEDS_A_TEMPLATE, REACHED_FROM_HOME } from '../constants/navigation-constants'
import type { Page } from '../types/navigation-types'

export function pageToShow(requested: Page, templates: Template[]): Page {
  if (templates.length === 0 && NEEDS_A_TEMPLATE.has(requested)) return 'templates'
  const kinds = new Set(templates.map((template) => template.kind))
  if (requested === 'upload' && !kinds.has('upload')) return 'home'
  if (requested === 'download' && !kinds.has('download')) return 'home'
  return requested
}

// Upload and Download are reached from Home, so the menu marks Home while they're open.
export function menuPageOf(page: Page): Page {
  return REACHED_FROM_HOME.has(page) ? 'home' : page
}
