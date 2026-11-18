// The icon for templates: Phosphor's Stack. See docs/UI.md.
import { Stack } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function TemplatesIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Stack} {...props} />
}
