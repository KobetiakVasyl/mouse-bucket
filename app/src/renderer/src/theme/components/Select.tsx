// A labelled drop-down drawn in the app's style instead of the system's: a box that shows the chosen option, and a list
// below it that works with the mouse and the keyboard, with an optional hint below the box. The label and each option
// may have a badge, such as Beta. See docs/UI.md.
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import type { ChoiceOption } from '../../types/component-types'
import { FOCUS } from '../styles/style-constants'
import { Badge } from './Badge'
import { CaretDownIcon, CheckIcon } from './icons'

export function Select<T extends string>({
  label,
  labelBadge,
  options,
  value,
  placeholder = '',
  hint,
  className = '',
  onChange
}: {
  label: string
  labelBadge?: string
  options: ChoiceOption<T>[]
  value: T | null
  placeholder?: string
  hint?: string
  className?: string
  onChange: (value: T) => void
}): React.JSX.Element {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const chosen = options.find((option) => option.value === value)

  // Keeps the option the keyboard is on in view.
  useEffect(() => {
    if (open) listRef.current?.children.item(active)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openList = (): void => {
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value)
      )
    )
    setOpen(true)
  }
  const choose = (index: number): void => {
    setOpen(false)
    onChange(options[index].value)
  }
  const moveTo = (index: number): void =>
    setActive(Math.min(Math.max(index, 0), options.length - 1))

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key
    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        openList()
      }
      return
    }
    if (key === 'Tab') {
      setOpen(false)
      return
    }
    event.preventDefault()
    // Escape closes only the list, not a dialog the drop-down is in.
    if (key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
    } else if (key === 'Enter' || key === ' ') choose(active)
    else if (key === 'ArrowDown') moveTo(active + 1)
    else if (key === 'ArrowUp') moveTo(active - 1)
    else if (key === 'Home' || key === 'PageUp') moveTo(0)
    else if (key === 'End' || key === 'PageDown') moveTo(options.length - 1)
  }

  return (
    <div className={className}>
      <span id={`${id}-label`} className="mb-1 flex items-center gap-2 font-semibold">
        {label}
        {labelBadge !== undefined && <Badge label={labelBadge} />}
      </span>
      <div className="relative max-w-md">
        <div
          role="combobox"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-labelledby={`${id}-label`}
          aria-describedby={hint === undefined ? undefined : `${id}-hint`}
          aria-activedescendant={open ? `${id}-option-${active}` : undefined}
          className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border bg-surface px-3 py-2 ${open ? 'border-ink' : 'border-line hover:border-muted'} ${FOCUS}`}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        >
          <span
            className={`flex min-w-0 items-center gap-2 ${chosen === undefined ? 'text-muted' : ''}`}
          >
            <span className="truncate">{chosen === undefined ? placeholder : chosen.label}</span>
            {chosen?.badge !== undefined && <Badge label={chosen.badge} />}
          </span>
          <CaretDownIcon className={`text-muted ${open ? 'rotate-180' : ''}`} />
        </div>
        {/* Pressing the mouse on the list keeps the focus on the box, so the list stays open until a click chooses. */}
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          hidden={!open}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
          onMouseDown={(event) => event.preventDefault()}
        >
          {options.map((option, index) => {
            const selected = option.value === value
            return (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={selected}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${index === active ? 'bg-hover' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-2 ${selected ? 'font-semibold' : ''}`}>
                    {option.label}
                    {option.badge !== undefined && <Badge label={option.badge} />}
                  </span>
                  {option.detail !== undefined && (
                    <span className="block truncate text-sm text-muted">{option.detail}</span>
                  )}
                </span>
                {selected && <CheckIcon />}
              </li>
            )
          })}
        </ul>
      </div>
      {hint !== undefined && (
        <span id={`${id}-hint`} className="mt-1 block text-sm text-muted">
          {hint}
        </span>
      )}
    </div>
  )
}
