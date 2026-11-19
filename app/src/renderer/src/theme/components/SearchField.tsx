// A search box: the search icon beside what's typed, with its label as the placeholder and its name for screen readers.
// Escape empties it. See docs/UI.md.
import { INPUT_CLASS } from '../styles/style-constants'
import { SearchIcon } from './icons'

export function SearchField({
  label,
  value,
  className = '',
  onChange
}: {
  label: string
  value: string
  className?: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className={`relative max-w-md ${className}`}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        spellCheck={false}
        className={`${INPUT_CLASS} pl-10 [&::-webkit-search-cancel-button]:appearance-none`}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value !== '') {
            event.preventDefault()
            onChange('')
          }
        }}
      />
    </div>
  )
}
