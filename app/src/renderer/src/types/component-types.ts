// Types the theme's components share with the code that uses them. See docs/UI.md.
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'positive'

// An option of a toggle group or a drop-down, with an optional badge, such as Beta, beside its label. A drop-down shows
// the detail, if any, below the label.
export interface ChoiceOption<T extends string> {
  value: T
  label: string
  badge?: string
  detail?: string
}

// What every icon takes: extra classes, and filled instead of the default outline.
export interface IconProps {
  className?: string
  filled?: boolean
}
