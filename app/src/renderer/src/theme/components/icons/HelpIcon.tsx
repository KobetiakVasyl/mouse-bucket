// The icon for How it works: Phosphor's Question. See docs/UI.md.
import { Question } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function HelpIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Question} {...props} />
}
