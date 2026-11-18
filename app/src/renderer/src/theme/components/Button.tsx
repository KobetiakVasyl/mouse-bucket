// A button in one of three looks: primary, secondary or the red danger. See docs/UI.md.
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
      className={`rounded-lg border px-4 py-2 disabled:pointer-events-none disabled:opacity-40 ${BUTTON_LOOKS[variant]} ${FOCUS} ${className}`}
      {...props}
    />
  )
}
