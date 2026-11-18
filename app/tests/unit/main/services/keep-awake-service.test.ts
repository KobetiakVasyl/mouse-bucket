import { describe, expect, it, vi } from 'vitest'
import { KeepAwakeService } from '../../../../src/main/services/keep-awake-service'

describe('KeepAwakeService', () => {
  it('holds one blocker however often it starts, and releases it on stop', () => {
    const blocker = { start: vi.fn(() => 7), stop: vi.fn(() => true) }
    const keepAwake = new KeepAwakeService(blocker)
    keepAwake.start()
    keepAwake.start()
    expect(blocker.start).toHaveBeenCalledTimes(1)
    expect(blocker.start).toHaveBeenCalledWith('prevent-app-suspension')
    keepAwake.stop()
    keepAwake.stop()
    expect(blocker.stop).toHaveBeenCalledTimes(1)
    expect(blocker.stop).toHaveBeenCalledWith(7)
  })
})
