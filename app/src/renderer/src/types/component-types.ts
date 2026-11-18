// Types the theme's components share with the code that uses them. See docs/UI.md.
export type ButtonVariant = 'primary' | 'secondary' | 'danger'

export interface ToggleOption<T extends string> {
  value: T
  label: string
}
