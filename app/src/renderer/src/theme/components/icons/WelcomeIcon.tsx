// The icon for the welcome page: Phosphor's HandWaving. See docs/UI.md.
import { HandWaving } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function WelcomeIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={HandWaving} {...props} />
}
