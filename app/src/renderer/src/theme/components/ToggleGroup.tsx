// Toggle buttons instead of radio buttons: exactly one option is pressed. See docs/UI.md.
import type { ChoiceOption } from '../../types/component-types'
import { FOCUS } from '../styles/style-constants'

export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: ChoiceOption<T>[]
  value: T
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <div>
      <span className="mb-1 block font-semibold">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1"
      >
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
    </div>
  )
}
