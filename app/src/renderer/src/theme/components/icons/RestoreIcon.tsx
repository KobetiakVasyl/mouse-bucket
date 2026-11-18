// The icon for restoring from the archive: Phosphor's ArrowCounterClockwise. See docs/UI.md.
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function RestoreIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={ArrowCounterClockwise} {...props} />
}
