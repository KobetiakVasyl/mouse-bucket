// The icon for pausing a transfer: Phosphor's Pause. See docs/UI.md.
import { Pause } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function PauseIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Pause} {...props} />
}
