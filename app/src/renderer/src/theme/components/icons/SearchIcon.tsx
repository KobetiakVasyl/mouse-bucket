// The icon for searching: Phosphor's MagnifyingGlass. See docs/UI.md.
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function SearchIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={MagnifyingGlass} {...props} />
}
