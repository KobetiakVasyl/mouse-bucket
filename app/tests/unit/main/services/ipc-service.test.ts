import type { IpcMainInvokeEvent } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { IpcService } from '../../../../src/main/services/ipc-service'
import type { IpcServices } from '../../../../src/main/types/ipc-handler-types'
import { Channel } from '../../../../src/shared/constants/ipc-constants'
import type { IpcResult } from '../../../../src/shared/types/ipc-types'

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<IpcResult<unknown>>

const APP_URL = 'file:///app/out/renderer/index.html'
const TEMPLATE_ID = '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f'

function setup(): {
  invoke: (channel: string, payload: unknown, url?: string) => Promise<IpcResult<unknown>>
  services: IpcServices
} {
  const listeners = new Map<string, Listener>()
  const services: IpcServices = {
    vault: { available: async () => true },
    settings: {
      get: vi.fn(),
      update: vi.fn(async () => ({
        theme: 'light' as const,
        welcomeSeen: true,
        defaultStorageClass: 'DEEP_ARCHIVE' as const,
        defaultRestoreTier: 'Bulk' as const,
        defaultRestoreDays: 7,
        downloadFolder: '/home/me/Downloads'
      })),
      chooseDownloadFolder: vi.fn()
    },
    templates: { list: vi.fn(async () => []), add: vi.fn(), delete: vi.fn(async () => undefined) },
    uploads: { chooseFiles: vi.fn(async () => 2), chooseFolder: vi.fn(), uploadPaths: vi.fn() },
    downloads: {
      listFolder: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      restoreFile: vi.fn()
    },
    transfers: { list: vi.fn(() => []), pause: vi.fn(), resume: vi.fn(), cancel: vi.fn() }
  }
  const registry = {
    handle: (channel: string, listener: Listener) => {
      listeners.set(channel, listener)
    }
  }
  new IpcService(registry as never, APP_URL, 'linux').register(services)
  const invoke = (
    channel: string,
    payload: unknown,
    url = APP_URL
  ): Promise<IpcResult<unknown>> => {
    const listener = listeners.get(channel)
    if (listener === undefined) throw new Error(`No handler for ${channel}`)
    const event = { senderFrame: { url }, sender: {} } as unknown as IpcMainInvokeEvent
    return listener(event, payload)
  }
  return { invoke, services }
}

describe('IpcService', () => {
  it('handles every invoke channel', async () => {
    const { invoke } = setup()
    for (const channel of Object.values(Channel)) {
      await expect(invoke(channel, undefined)).resolves.toHaveProperty('ok')
    }
  })

  it('passes a valid payload to the service and wraps its answer', async () => {
    const { invoke, services } = setup()
    const request = { templateId: TEMPLATE_ID, storageClass: 'STANDARD' }
    expect(await invoke(Channel.uploadChooseFiles, request)).toEqual({ ok: true, value: 2 })
    expect(services.uploads.chooseFiles).toHaveBeenCalledWith(request, {})
    expect(
      await invoke(Channel.uploadChooseFiles, { ...request, storageClass: 'GLACIER' })
    ).toMatchObject({ ok: false })
    expect(await invoke(Channel.settingsUpdate, { theme: 'light' })).toEqual({
      ok: true,
      value: {
        theme: 'light',
        welcomeSeen: true,
        defaultStorageClass: 'DEEP_ARCHIVE',
        defaultRestoreTier: 'Bulk',
        defaultRestoreDays: 7,
        downloadFolder: '/home/me/Downloads'
      }
    })
  })

  it('refuses requests from any page but the app’s own', async () => {
    const { invoke, services } = setup()
    expect(await invoke(Channel.templatesList, undefined, 'https://example.com/')).toEqual({
      ok: false,
      error: 'Request refused.'
    })
    expect(services.templates.list).not.toHaveBeenCalled()
  })

  it('rejects an invalid payload before any service sees it', async () => {
    const { invoke, services } = setup()
    expect(await invoke(Channel.templatesDelete, 'not-an-id')).toMatchObject({ ok: false })
    expect(await invoke(Channel.settingsUpdate, { theme: 'purple' })).toMatchObject({ ok: false })
    expect(await invoke(Channel.settingsUpdate, { downloadFolder: '/etc' })).toMatchObject({
      ok: false
    })
    expect(services.templates.delete).not.toHaveBeenCalled()
    expect(services.settings.update).not.toHaveBeenCalled()
  })
})
