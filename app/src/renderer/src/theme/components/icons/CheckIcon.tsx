// The icon that marks the chosen option of a drop-down: Phosphor's Check. See docs/UI.md.
import { Check } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function CheckIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Check} {...props} />
}
