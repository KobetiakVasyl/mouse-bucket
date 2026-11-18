// The side menu's items, and which pages need a template or are reached from Home. See docs/UI.md.
import type { MenuItem, Page } from '../types/navigation-types'

export const MENU_ITEMS: MenuItem[] = [
  { page: 'home', label: 'Home' },
  { page: 'templates', label: 'Templates' },
  { page: 'how-it-works', label: 'How it works' },
  { page: 'settings', label: 'Settings' }
]

export const NEEDS_A_TEMPLATE: ReadonlySet<Page> = new Set(['home', 'upload', 'download'])

// Upload and Download are reached from Home, so the menu marks Home while they're open.
export const REACHED_FROM_HOME: ReadonlySet<Page> = new Set(['upload', 'download'])
