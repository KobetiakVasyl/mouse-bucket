// The icon for copying text: Phosphor's Copy. See docs/UI.md.
import { Copy } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function CopyIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Copy} {...props} />
}
