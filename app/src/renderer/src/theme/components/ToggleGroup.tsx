// Toggle buttons instead of radio buttons: at most one option is pressed. Anything else the choice needs, such as a box for
// another value, goes beside the buttons, and an optional hint below them. See docs/UI.md.
import type { ReactNode } from 'react'
import type { ChoiceOption } from '../../types/component-types'
import { FOCUS } from '../styles/style-constants'

export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  hint,
  children,
  onChange
}: {
  label: string
  options: ChoiceOption<T>[]
  value: T | null
  hint?: string
  children?: ReactNode
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <div>
      <span className="mb-1 block font-semibold">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
          {options.map((option) => {
            const pressed = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={pressed}
                className={`rounded-lg px-4 py-1.5 ${pressed ? 'bg-ink text-paper' : 'text-ink hover:bg-hover'} ${FOCUS}`}
                onClick={() => onChange(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {children}
      </div>
      {hint !== undefined && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  )
}
