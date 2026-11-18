import { stat } from 'node:fs/promises'
import type { WebContents } from 'electron'
import { describe, expect, it } from 'vitest'
import { UploadService } from '../../../../src/main/services/upload-service'
import type { NewTransferRecord } from '../../../../src/main/types/transfer-queue-types'
import type { Template } from '../../../../src/shared/types/template-types'
import { appPath } from '../../../support/paths'

const TEMPLATE: Template = {
  id: '7d1c3f5e-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
  name: 'Reports',
  kind: 'upload',
  bucket: 'bucket-one',
  prefix: 'reports/',
  region: 'eu-west-1'
}
const SENDER = {} as WebContents

function setup(chosen: string[]): { service: UploadService; queued: NewTransferRecord[] } {
  const queued: NewTransferRecord[] = []
  const service = new UploadService(
    { getOfKind: async () => TEMPLATE },
    {
      add: (record) => {
        queued.push(record)
        return 'id'
      }
    },
    { chooseFiles: async () => chosen }
  )
  return { service, queued }
}

describe('UploadService', () => {
  it('queues each chosen file under the template’s folder, keeping its name', async () => {
    const file = appPath('package.json')
    const info = await stat(file)
    const { service, queued } = setup([file])
    const request = { templateId: TEMPLATE.id, storageClass: 'STANDARD' } as const
    expect(await service.chooseFiles(request, SENDER)).toBe(1)
    expect(queued).toEqual([
      {
        kind: 'upload',
        templateId: TEMPLATE.id,
        templateName: 'Reports',
        bucket: 'bucket-one',
        region: 'eu-west-1',
        key: 'reports/package.json',
        name: 'package.json',
        storageClass: 'STANDARD',
        filePath: file,
        fileSize: info.size,
        fileModifiedMs: info.mtimeMs,
        partSize: 8 * 1024 * 1024,
        uploadId: null,
        parts: []
      }
    ])
  })

  it('skips folders and queues nothing when the picker is cancelled', async () => {
    const request = { templateId: TEMPLATE.id, storageClass: 'DEEP_ARCHIVE' } as const
    expect(await setup([appPath('src')]).service.chooseFiles(request, SENDER)).toBe(0)
    expect(await setup([]).service.chooseFiles(request, SENDER)).toBe(0)
  })
})
