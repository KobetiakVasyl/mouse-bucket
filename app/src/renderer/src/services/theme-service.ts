// Switches the page between the dark and light grayscale themes. See docs/UI.md.
import type { Theme } from '../../../shared/types/settings-types'
import { DEFAULT_THEME } from '../constants/settings-constants'

export class ThemeService {
  constructor(private readonly root: HTMLElement) {}

  // Main passes the saved theme in the query string, so the first paint already uses it.
  fromQuery(search: string): Theme {
    return new URLSearchParams(search).get('theme') === 'light' ? 'light' : DEFAULT_THEME
  }

  apply(theme: Theme): void {
    this.root.classList.toggle('dark', theme === 'dark')
  }
}

export const themeService = new ThemeService(document.documentElement)
