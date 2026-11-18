// Which files the Download page offers to download, restore times, and the Restore dialog's choices. See docs/UI.md.
import type { FileAccess, RestoreTier } from '../../../shared/types/s3-types'
import type { ToggleOption } from '../types/component-types'

export const DOWNLOADABLE_STATES: ReadonlySet<FileAccess['state']> = new Set([
  'available',
  'restored'
])

// Typical restore times, by storage class and speed.
export const RESTORE_TIMES: ReadonlyMap<string, Record<RestoreTier, string>> = new Map([
  ['DEEP_ARCHIVE', { Standard: 'within 12 hours', Bulk: 'within 48 hours' }],
  ['GLACIER', { Standard: 'in 3 to 5 hours', Bulk: 'in 5 to 12 hours' }]
])

export const RESTORE_TIER_OPTIONS: ToggleOption<RestoreTier>[] = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Bulk', label: 'Bulk (cheaper)' }
]

export const DEFAULT_RESTORE_TIER: RestoreTier = 'Standard'
export const DEFAULT_RESTORE_DAYS = '7'
