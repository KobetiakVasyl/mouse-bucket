// The icon for choosing a folder: Phosphor's FolderPlus. See docs/UI.md.
import { FolderPlus } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function ChooseFolderIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={FolderPlus} {...props} />
}
