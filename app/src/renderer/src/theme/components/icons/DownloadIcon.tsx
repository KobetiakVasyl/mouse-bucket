// The icon for downloading: Phosphor's DownloadSimple. See docs/UI.md.
import { DownloadSimple } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function DownloadIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={DownloadSimple} {...props} />
}
