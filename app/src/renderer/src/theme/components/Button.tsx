// A button in one of four looks: primary, secondary, the red danger or the green positive, with an icon before its text. See docs/UI.md.
import type { ButtonHTMLAttributes } from 'react'
import type { ButtonVariant } from '../../types/component-types'
import { BUTTON_LOOKS, FOCUS } from '../styles/style-constants'

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }): React.JSX.Element {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 disabled:pointer-events-none disabled:opacity-40 ${BUTTON_LOOKS[variant]} ${FOCUS} ${className}`}
      {...props}
    />
  )
}
