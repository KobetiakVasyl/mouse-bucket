// Which files the Download page offers to download, restore times, and the Restore dialog's choices. See docs/UI.md.
import type { FileAccess, RestoreTier } from '../../../shared/types/s3-types'
import type { ChoiceOption } from '../types/component-types'

export const DOWNLOADABLE_STATES: ReadonlySet<FileAccess['state']> = new Set([
  'available',
  'restored'
])

// The archive classes, slowest to restore first.
export const ARCHIVE_CLASSES_SLOWEST_FIRST = ['DEEP_ARCHIVE', 'GLACIER']

// No file is selected.
export const NO_SELECTION: ReadonlySet<string> = new Set()

// How many names the Delete dialog lists before "and N more".
export const LISTED_NAMES = 5

// Typical restore times, by storage class and speed.
export const RESTORE_TIMES: ReadonlyMap<string, Record<RestoreTier, string>> = new Map([
  ['DEEP_ARCHIVE', { Standard: 'within 12 hours', Bulk: 'within 48 hours' }],
  ['GLACIER', { Standard: 'in 3 to 5 hours', Bulk: 'in 5 to 12 hours' }]
])

export const RESTORE_TIER_OPTIONS: ChoiceOption<RestoreTier>[] = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Bulk', label: 'Bulk (cheaper)' }
]
