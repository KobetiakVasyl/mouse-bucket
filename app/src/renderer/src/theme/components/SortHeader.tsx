// A table column heading that sorts by its column when clicked, with a caret showing which way while it's the one
// sorted. Screen readers hear the order through aria-sort. See docs/UI.md.
import type { SortDirection } from '../../types/download-types'
import { CELL, FOCUS } from '../styles/style-constants'
import { CaretDownIcon } from './icons'

export function SortHeader({
  label,
  direction,
  onSort
}: {
  label: string
  // null while another column is the one sorted.
  direction: SortDirection | null
  onSort: () => void
}): React.JSX.Element {
  return (
    <th className={CELL} aria-sort={direction === null ? 'none' : direction}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 rounded hover:text-ink ${direction === null ? '' : 'text-ink'} ${FOCUS}`}
        onClick={onSort}
      >
        {label}
        <CaretDownIcon
          className={`${direction === null ? 'opacity-40' : ''} ${direction === 'ascending' ? 'rotate-180' : ''}`}
        />
      </button>
    </th>
  )
}
