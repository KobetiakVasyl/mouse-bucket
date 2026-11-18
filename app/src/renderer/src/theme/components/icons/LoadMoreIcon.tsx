// The icon for loading more: Phosphor's CaretDown. See docs/UI.md.
import { CaretDown } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function LoadMoreIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={CaretDown} {...props} />
}
