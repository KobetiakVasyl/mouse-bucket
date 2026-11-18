// The icon for uploading: Phosphor's CloudArrowUp. See docs/UI.md.
import { CloudArrowUp } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function UploadIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={CloudArrowUp} {...props} />
}
