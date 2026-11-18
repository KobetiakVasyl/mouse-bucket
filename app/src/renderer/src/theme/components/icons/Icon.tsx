// Draws a Phosphor icon in the app's style: outlined unless filled, a little larger than the text beside it, and hidden
// from screen readers, because text always goes with it. See docs/UI.md.
import type { Icon as Glyph } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'

export function Icon({
  glyph: Glyph,
  filled = false,
  className = ''
}: IconProps & { glyph: Glyph }): React.JSX.Element {
  return (
    <Glyph
      weight={filled ? 'fill' : 'regular'}
      size="1.25em"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    />
  )
}
