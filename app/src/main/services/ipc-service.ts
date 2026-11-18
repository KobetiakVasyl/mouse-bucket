// Connects each invoke channel to main's services, behind the sender and payload checks. See docs/ARCHITECTURE.md.
import { Channel } from '../../shared/constants/ipc-constants'
import type { InvokeChannel } from '../../shared/types/ipc-types'
import { REQUEST_SCHEMAS } from '../../shared/validation/ipc-validation'
import { REQUEST_REFUSED_MESSAGE } from '../constants/error-constants'
import type { IpcHandler, IpcRegistry, IpcServices } from '../types/ipc-handler-types'
import { isTrustedSender, runHandler } from '../validation/request-validation'

export class IpcService {
  constructor(
    private readonly ipc: IpcRegistry,
    // The page's own URL: only it may call main.
    private readonly appUrl: string,
    private readonly platform: string
  ) {}

  register(services: IpcServices): void {
    const { vault, settings, templates, uploads, downloads, transfers } = services
    this.handle(Channel.appStatus, async () => ({ encryptionAvailable: await vault.available() }))
    this.handle(Channel.settingsGet, () => settings.get())
    this.handle(Channel.settingsUpdate, (update) => settings.update(update))
    this.handle(Channel.templatesList, () => templates.list())
    this.handle(Channel.templatesCreate, (input) => templates.add(input))
    this.handle(Channel.templatesDelete, (id) => templates.delete(id))
    this.handle(Channel.uploadChooseFiles, (request, event) =>
      uploads.chooseFiles(request, event.sender)
    )
    this.handle(Channel.downloadList, (request) => downloads.listFolder(request))
    this.handle(Channel.downloadFile, (request, event) =>
      downloads.downloadFile(request, event.sender)
    )
    this.handle(Channel.downloadDelete, (request) => downloads.deleteFile(request))
    this.handle(Channel.downloadRestore, (request) => downloads.restoreFile(request))
    this.handle(Channel.transfersList, async () => transfers.list())
    this.handle(Channel.transfersCancel, async (id) => transfers.cancel(id))
  }

  private handle<C extends InvokeChannel>(channel: C, handler: IpcHandler<C>): void {
    this.ipc.handle(channel, (event, payload: unknown) => {
      const frame = event.senderFrame
      const trusted = frame !== null && isTrustedSender(frame.url, this.appUrl, this.platform)
      if (!trusted) return { ok: false, error: REQUEST_REFUSED_MESSAGE }
      return runHandler(REQUEST_SCHEMAS[channel], payload, (input) => handler(input, event))
    })
  }
}
