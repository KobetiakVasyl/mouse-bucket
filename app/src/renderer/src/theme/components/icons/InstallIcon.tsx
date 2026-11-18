// The icon for installing an update: Phosphor's RocketLaunch. See docs/UI.md.
import { RocketLaunch } from '@phosphor-icons/react'
import type { IconProps } from '../../../types/component-types'
import { Icon } from './Icon'

export function InstallIcon(props: IconProps): React.JSX.Element {
  return <Icon glyph={RocketLaunch} {...props} />
}
