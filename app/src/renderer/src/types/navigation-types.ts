// The app's pages and the side menu's items. See docs/UI.md.
export type Page = 'home' | 'upload' | 'download' | 'templates' | 'how-it-works' | 'settings'

export interface MenuItem {
  page: Page
  label: string
}
