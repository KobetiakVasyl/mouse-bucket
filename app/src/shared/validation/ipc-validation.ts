// The schema main checks each invoke channel's payload against before handling it. See docs/ARCHITECTURE.md.
import { z } from 'zod'
import { Channel } from '../constants/ipc-constants'
import type { InvokeChannel, Requests } from '../types/ipc-types'
import {
  DownloadRequestSchema,
  FolderRequestSchema,
  RestoreRequestSchema,
  UploadRequestSchema
} from './s3-validation'
import { SettingsUpdateSchema } from './settings-validation'
import { NewTemplateSchema, TemplateIdSchema } from './template-validation'

const NoPayload = z.undefined()

// Its type ties every schema to the channel's entry in Requests, so the two can't drift apart.
export const REQUEST_SCHEMAS: { [C in InvokeChannel]: z.ZodType<Requests[C]> } = {
  [Channel.appStatus]: NoPayload,
  [Channel.settingsGet]: NoPayload,
  [Channel.settingsUpdate]: SettingsUpdateSchema,
  [Channel.settingsChooseDownloadFolder]: NoPayload,
  [Channel.templatesList]: NoPayload,
  [Channel.templatesCreate]: NewTemplateSchema,
  [Channel.templatesDelete]: TemplateIdSchema,
  [Channel.uploadChooseFiles]: UploadRequestSchema,
  [Channel.downloadList]: FolderRequestSchema,
  [Channel.downloadFile]: DownloadRequestSchema,
  [Channel.downloadDelete]: DownloadRequestSchema,
  [Channel.downloadRestore]: RestoreRequestSchema,
  [Channel.transfersList]: NoPayload,
  [Channel.transfersCancel]: z.string().min(1).max(100)
}
