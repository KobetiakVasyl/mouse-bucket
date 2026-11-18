// When opening the updates dialog checks GitHub by itself: not while an update is found, downloading or downloaded,
// which a new check would forget. See docs/PACKAGING.md.
import type { UpdateState } from '../../../shared/types/update-types'

export const CHECK_ON_OPEN: ReadonlySet<UpdateState['status']> = new Set([
  'idle',
  'current',
  'failed'
])
