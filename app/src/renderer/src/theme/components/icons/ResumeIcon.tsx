// The icon for resuming a transfer: Phosphor's Play. See docs/UI.md.
import { Play } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function ResumeIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Play} {...props} />
}
