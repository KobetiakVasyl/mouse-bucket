// A labelled drop-down of a few named choices, with an optional hint below it. See docs/UI.md.
import type { ChoiceOption } from '../../types/component-types'
import { INPUT_CLASS } from '../styles/style-constants'
import { Field } from './Field'

export function Select<T extends string>({
  label,
  options,
  value,
  hint,
  onChange
}: {
  label: string
  options: ChoiceOption<T>[]
  value: T
  hint?: string
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <Field label={label} hint={hint}>
      <select
        className={`${INPUT_CLASS} max-w-md`}
        value={value}
        onChange={(event) => {
          const chosen = options.find((option) => option.value === event.target.value)
          if (chosen !== undefined) onChange(chosen.value)
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
