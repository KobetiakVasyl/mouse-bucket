// The icon for Settings: Phosphor's Gear. See docs/UI.md.
import { Gear } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function SettingsIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Gear} {...props} />
}
