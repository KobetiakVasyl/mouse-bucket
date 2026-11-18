// The icon for choosing files: Phosphor's FilePlus. See docs/UI.md.
import { FilePlus } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function ChooseFilesIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={FilePlus} {...props} />
}
