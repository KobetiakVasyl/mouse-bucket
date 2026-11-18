// The icon for deleting: Phosphor's Trash. See docs/UI.md.
import { Trash } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function DeleteIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Trash} {...props} />
}
