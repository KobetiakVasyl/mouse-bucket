// Switches the page between the dark and light grayscale themes. See docs/UI.md.
import type { Theme } from '../../shared/ipc'

// Main passes the saved theme in the query string, so the first paint already uses it.
export function themeFromQuery(search: string): Theme {
  return new URLSearchParams(search).get('theme') === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}
