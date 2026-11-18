// The icon for adding: Phosphor's Plus. See docs/UI.md.
import { Plus } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function AddIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Plus} {...props} />
}
