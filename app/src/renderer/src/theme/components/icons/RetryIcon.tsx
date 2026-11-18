// The icon for trying a transfer again: Phosphor's ArrowClockwise. See docs/UI.md.
import { ArrowClockwise } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function RetryIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={ArrowClockwise} {...props} />
}
