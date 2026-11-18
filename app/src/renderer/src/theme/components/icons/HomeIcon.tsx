// The icon for Home: Phosphor's House. See docs/UI.md.
import { House } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function HomeIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={House} {...props} />
}
