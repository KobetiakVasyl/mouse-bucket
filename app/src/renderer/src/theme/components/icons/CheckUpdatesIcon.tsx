// The icon for checking for updates: Phosphor's ArrowsClockwise. See docs/UI.md.
import { ArrowsClockwise } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function CheckUpdatesIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={ArrowsClockwise} {...props} />
}
