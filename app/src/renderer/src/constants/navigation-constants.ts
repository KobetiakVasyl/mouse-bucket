// The side menu's items at the top and at the bottom, and which pages are reached from Home. See docs/UI.md.
import type { MenuItem, Page } from '../types/navigation-types'
import { HelpIcon, HomeIcon, SettingsIcon, TemplatesIcon } from '../theme/components/icons'

export const MENU_ITEMS: MenuItem[] = [
  { page: 'home', label: 'Home', icon: HomeIcon },
  { page: 'templates', label: 'Templates', icon: TemplatesIcon },
  { page: 'settings', label: 'Settings', icon: SettingsIcon }
]

// At the bottom, next to the way back to the welcome page.
export const MENU_FOOTER_ITEMS: MenuItem[] = [
  { page: 'how-it-works', label: 'How it works', icon: HelpIcon }
]

// Upload and Browse are reached from Home, so the menu marks Home while they're open.
export const REACHED_FROM_HOME: ReadonlySet<Page> = new Set(['upload', 'download'])
