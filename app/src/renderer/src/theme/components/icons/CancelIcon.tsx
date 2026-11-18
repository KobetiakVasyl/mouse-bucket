// The icon for cancelling or clearing: Phosphor's X. See docs/UI.md.
import { X } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function CancelIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={X} {...props} />
}
