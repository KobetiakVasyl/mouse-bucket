// A checkbox with rounded corners in the theme's ink, named for screen readers by its label. See docs/UI.md.
import { FOCUS } from '../styles/style-constants'

export function Checkbox({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className={`size-4 cursor-pointer rounded accent-ink ${FOCUS}`}
    />
  )
}
