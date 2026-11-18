// The icon that marks a drop-down: Phosphor's CaretDown. See docs/UI.md.
import { CaretDown } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function CaretDownIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={CaretDown} {...props} />
}
