// Which files the Browse page offers to download, restore times, and the choices of a restore. See docs/UI.md.
import type {
  FileAccess,
  RehydratePriority,
  RehydrateTier,
  RestoreTier
} from '../../../shared/types/storage-types'
import type { ChoiceOption } from '../types/component-types'
import type { FileSort, FileSortKey, SortDirection } from '../types/download-types'

export const DOWNLOADABLE_STATES: ReadonlySet<FileAccess['state']> = new Set([
  'available',
  'restored'
])

// The archive classes, slowest to restore first.
export const ARCHIVE_CLASSES_SLOWEST_FIRST = ['DEEP_ARCHIVE', 'GLACIER']

// Files start sorted by name, A to Z. A column's first click sorts names A to Z, and dates newest first.
export const DEFAULT_FILE_SORT: FileSort = { by: 'name', direction: 'ascending' }
export const FIRST_SORT_DIRECTIONS: Record<FileSortKey, SortDirection> = {
  name: 'ascending',
  modified: 'descending'
}

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
  { value: 'Bulk', label: 'Bulk' }
]

// How the chosen speed compares with the other one, shown below the speed's buttons.
export const RESTORE_TIER_HINTS: Record<RestoreTier, string> = {
  Standard: 'Standard is faster than Bulk, and costs more.',
  Bulk: 'Bulk is cheaper than Standard, and takes longer.'
}

// The tiers an archived Azure blob can be rehydrated into, and how fast.
export const REHYDRATE_TIER_OPTIONS: ChoiceOption<RehydrateTier>[] = [
  { value: 'Hot', label: 'Hot' },
  { value: 'Cool', label: 'Cool' },
  { value: 'Cold', label: 'Cold' }
]

export const REHYDRATE_PRIORITY_OPTIONS: ChoiceOption<RehydratePriority>[] = [
  { value: 'Standard', label: 'Standard' },
  { value: 'High', label: 'High' }
]

export const REHYDRATE_PRIORITY_HINTS: Record<RehydratePriority, string> = {
  Standard: 'Usually ready within 15 hours.',
  High: 'Usually ready within an hour for files under 10 GB, and costs more.'
}

// The rehydrate dialog starts with these.
export const REHYDRATE_DEFAULTS: { tier: RehydrateTier; priority: RehydratePriority } = {
  tier: 'Hot',
  priority: 'Standard'
}

// The days a restored copy stays that have buttons of their own; any other number is typed in.
export const RESTORE_DAY_OPTIONS: ChoiceOption<string>[] = ['1', '2', '3', '4', '5', '6', '7'].map(
  (days) => ({ value: days, label: days })
)
