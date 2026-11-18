// Connects each IPC channel to main's services, behind the sender and payload checks. See docs/ARCHITECTURE.md.
import { stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { S3Client } from '@aws-sdk/client-s3'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type OpenDialogOptions,
  type OpenDialogReturnValue,
  type SaveDialogOptions,
  type SaveDialogReturnValue
} from 'electron'
import { Channel, type InvokeChannel } from '../../shared/channels'
import {
  requests,
  type Requests,
  type Responses,
  type Template,
  type TemplateKind
} from '../../shared/ipc'
import { parseS3Location } from '../../shared/s3-location'
import { UserError } from '../errors'
import { saveNameFor } from '../file-names'
import type { KeyVault } from '../key-vault'
import { createS3Client, detectBucketRegion, DISCOVERY_REGION } from '../s3/client'
import { downloadFile } from '../s3/download'
import { listFolder } from '../s3/list'
import { deleteObject, restoreObject } from '../s3/objects'
import { uploadFile } from '../s3/upload'
import type { SettingsStore } from '../settings'
import { NO_ENCRYPTION_MESSAGE, type TemplateStore } from '../templates'
import type { TransferQueue } from '../transfers'
import { isTrustedSender, runHandler } from './guard'

export interface Services {
  settings: SettingsStore
  templates: TemplateStore
  transfers: TransferQueue
  vault: KeyVault
}

type Handler<C extends InvokeChannel> = (
  input: Requests[C],
  event: IpcMainInvokeEvent
) => Promise<Responses[C]>

export function registerIpc(services: Services, appUrl: string): void {
  const { settings, templates, transfers, vault } = services

  function handle<C extends InvokeChannel>(channel: C, handler: Handler<C>): void {
    ipcMain.handle(channel, (event, payload: unknown) => {
      const frame = event.senderFrame
      const trusted = frame !== null && isTrustedSender(frame.url, appUrl, process.platform)
      if (!trusted) return { ok: false, error: 'Request refused.' }
      return runHandler(requests[channel], payload, (input) => handler(input, event))
    })
  }

  async function templateOfKind(id: string, kind: TemplateKind): Promise<Template> {
    const template = await templates.get(id)
    if (template.kind !== kind) throw new UserError(`"${template.name}" isn't a ${kind} template.`)
    return template
  }

  async function withClient<T>(
    template: Template,
    work: (client: S3Client) => Promise<T>
  ): Promise<T> {
    const client = createS3Client(template.region, await templates.credentialsFor(template.id))
    try {
      return await work(client)
    } finally {
      client.destroy()
    }
  }

  // Dialogs attach to the window that asked, so they open in front of it.
  function showOpenDialog(
    event: IpcMainInvokeEvent,
    options: OpenDialogOptions
  ): Promise<OpenDialogReturnValue> {
    const window = BrowserWindow.fromWebContents(event.sender)
    return window === null ? dialog.showOpenDialog(options) : dialog.showOpenDialog(window, options)
  }

  function showSaveDialog(
    event: IpcMainInvokeEvent,
    options: SaveDialogOptions
  ): Promise<SaveDialogReturnValue> {
    const window = BrowserWindow.fromWebContents(event.sender)
    return window === null ? dialog.showSaveDialog(options) : dialog.showSaveDialog(window, options)
  }

  handle(Channel.appStatus, async () => ({ encryptionAvailable: await vault.available() }))
  handle(Channel.settingsGet, () => settings.get())
  handle(Channel.settingsUpdate, (update) => settings.update(update))
  handle(Channel.templatesList, () => templates.list())
  handle(Channel.templatesDelete, (id) => templates.delete(id))

  handle(Channel.templatesCreate, async (input) => {
    if (!(await vault.available())) throw new UserError(NO_ENCRYPTION_MESSAGE)
    const parsed = parseS3Location(input.location)
    if ('error' in parsed) throw new UserError(parsed.error)
    const { bucket, prefix } = parsed.location
    if (input.kind === 'download' && prefix !== '') {
      throw new UserError('A download template points at a whole bucket. Remove the folder.')
    }
    // Copied keys stay in main: the page only names the template to copy them from.
    const credentials =
      input.keys.source === 'entered'
        ? { accessKeyId: input.keys.accessKeyId, secretAccessKey: input.keys.secretAccessKey }
        : await templates.credentialsFor(input.keys.templateId)
    const discovery = createS3Client(DISCOVERY_REGION, credentials)
    let region: string
    try {
      region = await detectBucketRegion(discovery, bucket)
    } finally {
      discovery.destroy()
    }
    return templates.create(
      { name: input.name, kind: input.kind, bucket, prefix, region },
      credentials
    )
  })

  // Main opens the file picker itself, so the page never handles a local path. See docs/SECURITY.md.
  handle(Channel.uploadChooseFiles, async (templateId, event) => {
    const template = await templateOfKind(templateId, 'upload')
    const options: OpenDialogOptions = {
      title: `Upload to ${template.name}`,
      properties: ['openFile', 'multiSelections']
    }
    const result = await showOpenDialog(event, options)
    if (result.canceled) return 0

    let queued = 0
    for (const filePath of result.filePaths) {
      const info = await stat(filePath)
      if (!info.isFile()) continue
      const name = basename(filePath)
      transfers.add(
        { kind: 'upload', templateName: template.name, name, bytesTotal: info.size },
        ({ signal, progress }) =>
          withClient(template, (client) =>
            uploadFile({
              client,
              bucket: template.bucket,
              key: `${template.prefix}${name}`,
              filePath,
              fileSize: info.size,
              signal,
              onProgress: (bytesDone) => progress(bytesDone, info.size)
            })
          )
      )
      queued++
    }
    return queued
  })

  handle(Channel.downloadList, async ({ templateId, prefix, continuationToken }) => {
    const template = await templateOfKind(templateId, 'download')
    return withClient(template, (client) =>
      listFolder(client, template.bucket, prefix, continuationToken)
    )
  })

  // Main opens the Save dialog itself; the page only names the S3 key. See docs/SECURITY.md.
  handle(Channel.downloadFile, async ({ templateId, key }, event) => {
    const template = await templateOfKind(templateId, 'download')
    const options: SaveDialogOptions = {
      title: 'Save the downloaded file',
      defaultPath: join(app.getPath('downloads'), saveNameFor(key))
    }
    const result = await showSaveDialog(event, options)
    if (result.canceled) return false

    const targetPath = result.filePath
    transfers.add(
      { kind: 'download', templateName: template.name, name: basename(targetPath), bytesTotal: 0 },
      ({ signal, progress }) =>
        withClient(template, (client) =>
          downloadFile({
            client,
            bucket: template.bucket,
            key,
            targetPath,
            signal,
            onProgress: progress
          })
        )
    )
    return true
  })

  handle(Channel.downloadDelete, async ({ templateId, key }) => {
    const template = await templateOfKind(templateId, 'download')
    await withClient(template, (client) => deleteObject(client, template.bucket, key))
  })

  handle(Channel.downloadRestore, async ({ templateId, key, tier, days }) => {
    const template = await templateOfKind(templateId, 'download')
    await withClient(template, (client) => restoreObject(client, template.bucket, key, tier, days))
  })

  handle(Channel.transfersList, async () => transfers.list())
  handle(Channel.transfersCancel, async (id) => transfers.cancel(id))
}
