import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { UpdateService } from '../../../../src/main/services/update-service'
import type { Updater } from '../../../../src/main/types/update-types'
import type { UpdateState } from '../../../../src/shared/types/update-types'

// A stand-in for electron-updater's autoUpdater, whose events the test sends itself.
function fakeUpdater(): {
  updater: Updater
  emitter: EventEmitter
  settings: { autoDownload: boolean; autoInstallOnAppQuit: boolean; allowPrerelease: boolean }
  calls: { check: number; download: number; install: number }
} {
  const emitter = new EventEmitter()
  const calls = { check: 0, download: 0, install: 0 }
  const settings = { autoDownload: true, autoInstallOnAppQuit: true, allowPrerelease: false }
  const updater = {
    on: (event: string, listener: (...args: unknown[]) => void) => {
      emitter.on(event, listener)
      return updater
    },
    checkForUpdates: async () => {
      calls.check++
      return null
    },
    downloadUpdate: async () => {
      calls.download++
      return []
    },
    quitAndInstall: () => {
      calls.install++
    },
    set autoDownload(value: boolean) {
      settings.autoDownload = value
    },
    set autoInstallOnAppQuit(value: boolean) {
      settings.autoInstallOnAppQuit = value
    },
    set allowPrerelease(value: boolean) {
      settings.allowPrerelease = value
    }
  } as unknown as Updater
  return { updater, emitter, settings, calls }
}

describe('UpdateService', () => {
  it('does nothing where the app can’t update itself', async () => {
    const service = new UpdateService(null, false, () => undefined)
    expect(await service.check()).toEqual({ status: 'unsupported' })
  })

  it('only checks, downloads and installs when asked', async () => {
    const { updater, emitter, settings, calls } = fakeUpdater()
    const states: UpdateState[] = []
    const service = new UpdateService(updater, true, (state) => states.push(state))
    expect(settings).toEqual({
      autoDownload: false,
      autoInstallOnAppQuit: false,
      allowPrerelease: true
    })
    expect(service.status).toEqual({ status: 'idle' })

    const checking = service.check()
    emitter.emit('update-available', { version: '0.3.0' })
    await checking
    expect(service.status).toEqual({ status: 'available', version: '0.3.0' })
    expect(calls).toEqual({ check: 1, download: 0, install: 0 })

    service.install()
    expect(calls.install).toBe(0)
    const downloading = service.download()
    emitter.emit('download-progress', { percent: 41.7 })
    emitter.emit('update-downloaded', { version: '0.3.0' })
    await downloading
    service.install()
    expect(calls).toEqual({ check: 1, download: 1, install: 1 })
    expect(states.map((state) => state.status)).toEqual([
      'checking',
      'available',
      'downloading',
      'downloading',
      'ready'
    ])
    expect(states[3]).toEqual({ status: 'downloading', version: '0.3.0', percent: 41 })
  })

  it('says when the newest version is running, and explains failures safely', async () => {
    const { updater, emitter } = fakeUpdater()
    const service = new UpdateService(updater, false, () => undefined)
    const checking = service.check()
    emitter.emit('update-not-available', { version: '0.2.0' })
    await checking
    expect(service.status).toEqual({ status: 'current' })

    emitter.emit(
      'error',
      Object.assign(new Error('getaddrinfo ENOTFOUND github.com'), { code: 'ENOTFOUND' })
    )
    expect(service.status).toEqual({
      status: 'failed',
      error: "Couldn't reach GitHub. Check the internet connection and try again."
    })
  })
})
