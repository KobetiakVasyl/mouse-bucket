// The icon for editing: Phosphor's PencilSimple. See docs/UI.md.
import { PencilSimple } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function EditIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={PencilSimple} {...props} />
}
