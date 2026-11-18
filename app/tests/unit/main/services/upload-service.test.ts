import { join } from 'node:path'
import type { WebContents } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { UploadService } from '../../../../src/main/services/upload-service'
import type { BucketAccess } from '../../../../src/main/types/credential-types'
import type { UploadFileOptions } from '../../../../src/main/types/s3-service-types'
import type { TransferTask } from '../../../../src/main/types/transfer-queue-types'
import type { TransferDetails } from '../../../../src/shared/types/transfer-types'
import type { Template } from '../../../../src/shared/types/template-types'
import { appPath } from '../../../support/paths'

const TEMPLATE: Template = {
  id: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  name: 'Reports',
  kind: 'upload',
  bucket: 'b1',
  prefix: 'reports/',
  region: 'eu-west-1'
}
const ACCESS: BucketAccess = {
  bucket: 'b1',
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
}
const SENDER = {} as WebContents

function setup(chosen: string[]): {
  service: UploadService
  queued: { details: TransferDetails; task: TransferTask }[]
  uploaded: UploadFileOptions[]
} {
  const queued: { details: TransferDetails; task: TransferTask }[] = []
  const uploaded: UploadFileOptions[] = []
  const service = new UploadService(
    { getOfKind: async () => TEMPLATE, accessFor: async () => ACCESS },
    {
      uploadFile: async (_access, options) => {
        uploaded.push(options)
      }
    },
    {
      add: (details, task) => {
        queued.push({ details, task })
        return 'id'
      }
    },
    { chooseFiles: async () => chosen }
  )
  return { service, queued, uploaded }
}

describe('UploadService', () => {
  it('queues each chosen file under the template’s folder, keeping its name', async () => {
    const file = appPath('package.json')
    const { service, queued, uploaded } = setup([file])
    expect(await service.chooseFiles(TEMPLATE.id, SENDER)).toBe(1)
    expect(queued[0].details).toMatchObject({
      kind: 'upload',
      templateName: 'Reports',
      name: 'package.json'
    })
    const progress = vi.fn()
    await queued[0].task({ signal: new AbortController().signal, progress })
    expect(uploaded[0]).toMatchObject({ key: 'reports/package.json', filePath: file })
    uploaded[0].onProgress(3)
    expect(progress).toHaveBeenCalledWith(3, uploaded[0].fileSize)
  })

  it('skips folders and queues nothing when the picker is cancelled', async () => {
    expect(await setup([join(appPath('src'))]).service.chooseFiles(TEMPLATE.id, SENDER)).toBe(0)
    expect(await setup([]).service.chooseFiles(TEMPLATE.id, SENDER)).toBe(0)
  })
})
