// The icon for browsing a bucket: Phosphor's FolderOpen. See docs/UI.md.
import { FolderOpen } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function BrowseIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={FolderOpen} {...props} />
}
