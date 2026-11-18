// The icon for a file: Phosphor's File. See docs/UI.md.
import { File } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function FileIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={File} {...props} />
}
