// Keeps the computer from sleeping while transfers are pending; the screen may still turn off. See docs/ARCHITECTURE.md.
import type { KeepAwake, SleepBlocker } from '../types/transfer-queue-types'

export class KeepAwakeService implements KeepAwake {
  private blockerId: number | undefined

  constructor(private readonly blocker: SleepBlocker) {}

  start(): void {
    if (this.blockerId === undefined) this.blockerId = this.blocker.start('prevent-app-suspension')
  }

  stop(): void {
    if (this.blockerId !== undefined) this.blocker.stop(this.blockerId)
    this.blockerId = undefined
  }
}
