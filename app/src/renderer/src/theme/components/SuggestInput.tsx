// A text box that offers values in a list below it while it has the focus, drawn like the app's drop-downs: those that
// start with what's typed. The mouse, or the arrow keys and Enter, fill one in, and Escape closes only the list. See
// docs/UI.md.
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import type { Suggestion } from '../../types/component-types'
import { INPUT_CLASS } from '../styles/style-constants'

export function SuggestInput({
  value,
  suggestions,
  required = false,
  onChange
}: {
  value: string
  suggestions: Suggestion[]
  required?: boolean
  onChange: (value: string) => void
}): React.JSX.Element {
  const id = useId()
  const [open, setOpen] = useState(false)
  // The suggestion the keyboard is on, or -1 for none.
  const [active, setActive] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)
  const typed = value.trim().toLocaleLowerCase()
  const matches = suggestions.filter(
    (suggestion) =>
      suggestion.value !== value && suggestion.value.toLocaleLowerCase().startsWith(typed)
  )
  const shown = open && matches.length > 0

  useEffect(() => {
    if (shown && active >= 0) {
      listRef.current?.children.item(active)?.scrollIntoView({ block: 'nearest' })
    }
  }, [shown, active])

  const close = (): void => {
    setOpen(false)
    setActive(-1)
  }
  const choose = (suggestion: Suggestion): void => {
    onChange(suggestion.value)
    close()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length > 0) {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setOpen(true)
      setActive((current) =>
        current < 0 && step < 0
          ? matches.length - 1
          : (current + step + matches.length) % matches.length
      )
    } else if (event.key === 'Enter' && shown && active >= 0 && active < matches.length) {
      // Fills in the suggestion instead of sending the form.
      event.preventDefault()
      choose(matches[active])
    } else if (event.key === 'Escape' && shown) {
      // Escape closes only the list, not a dialog the box is in.
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  return (
    <div className="relative">
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={`${id}-list`}
        aria-activedescendant={shown && active >= 0 ? `${id}-option-${active}` : undefined}
        className={INPUT_CLASS}
        value={value}
        required={required}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={onKeyDown}
      />
      {/* Pressing the mouse on the list keeps the focus in the box, so the list stays open until a click chooses. */}
      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-label="Suggestions"
        hidden={!shown}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        onMouseDown={(event) => event.preventDefault()}
      >
        {matches.map((suggestion, index) => (
          <li
            key={suggestion.value}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === active}
            className={`cursor-pointer rounded-lg px-3 py-2 ${index === active ? 'bg-hover' : ''}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(suggestion)}
          >
            <span className="block truncate">{suggestion.value}</span>
            {suggestion.detail !== undefined && (
              <span className="block truncate text-sm text-muted">{suggestion.detail}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
