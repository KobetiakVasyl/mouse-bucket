// The icon for a folder: Phosphor's Folder. See docs/UI.md.
import { Folder } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function FolderIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={Folder} {...props} />
}
