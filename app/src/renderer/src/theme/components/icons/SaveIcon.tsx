// The icon for saving: Phosphor's Check. See docs/UI.md.
import { Check } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function SaveIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Check} {...props} />
}
