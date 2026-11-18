// What the app shell loads from main on start, and how far that got. See docs/UI.md.
import type { AppStatus } from '../../../shared/types/ipc-types'
import type { Settings } from '../../../shared/types/settings-types'
import type { Template } from '../../../shared/types/template-types'

export interface AppData {
  status: AppStatus
  settings: Settings
  templates: Template[]
}

export type AppLoad =
  { state: 'loading' } | { state: 'ready'; data: AppData } | { state: 'failed'; error: string }

// What the page reports on <html> for the launch check.
export type LoadState = 'ready' | 'failed'
