// Keeps the computer from sleeping while transfers are pending; the screen may still turn off. See docs/ARCHITECTURE.md.
import { powerSaveBlocker } from 'electron'
import type { KeepAwake } from './transfers'

export function systemKeepAwake(): KeepAwake {
  let blockerId: number | undefined
  return {
    start() {
      if (blockerId === undefined) blockerId = powerSaveBlocker.start('prevent-app-suspension')
    },
    stop() {
      if (blockerId !== undefined) powerSaveBlocker.stop(blockerId)
      blockerId = undefined
    }
  }
}
