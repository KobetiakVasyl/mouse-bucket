// A platform's name, with a Beta badge for the platforms in beta. See docs/UI.md.
import type { Platform } from '../../../../shared/types/template-types'
import { BETA_LABEL, BETA_PLATFORMS, PLATFORM_LABELS } from '../../constants/platform-constants'
import { Badge } from '../components/Badge'

export function PlatformLabel({ platform }: { platform: Platform }): React.JSX.Element {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {PLATFORM_LABELS[platform]}
      {BETA_PLATFORMS.has(platform) && <Badge label={BETA_LABEL} />}
    </span>
  )
}
