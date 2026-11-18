import { describe, expect, it } from 'vitest'
import type { Template } from '../../../../../src/shared/types/template-types'
import {
  driveFolderInput,
  formatAzureLocation,
  formatLocation,
  formatS3Location,
  locationInput,
  rootLabel,
  templateLocation
} from '../../../../../src/renderer/src/utils/location-utils'

const base = { id: '6f1c2b8e-4a3d-4f5e-9b7a-1c2d3e4f5a6b', name: 'T', kind: 'download' } as const
const S3: Template = { ...base, platform: 's3', bucket: 'b1', prefix: '', region: 'eu-west-1' }
const AZURE: Template = {
  ...base,
  platform: 'azure',
  account: 'myaccount',
  container: 'backups',
  prefix: ''
}
const DRIVE: Template = {
  ...base,
  platform: 'google-drive',
  folderId: '1AbCdEfGhIjKlMnOp',
  folderName: 'Photos'
}

describe('formatS3Location and formatAzureLocation', () => {
  it('write the s3:// form and the container URL', () => {
    expect(formatS3Location({ bucket: 'b1', prefix: 'a/' })).toBe('s3://b1/a/')
    expect(formatS3Location({ bucket: 'b1', prefix: '' })).toBe('s3://b1/')
    expect(formatAzureLocation({ account: 'myaccount', container: 'backups', prefix: 'a/' })).toBe(
      'https://myaccount.blob.core.windows.net/backups/a/'
    )
  })
})

describe('templateLocation, locationInput and rootLabel', () => {
  it('show S3 and Azure by address, and a Drive folder by name, or its link to change it', () => {
    expect(templateLocation(S3)).toBe('s3://b1/')
    expect(templateLocation(AZURE)).toBe('https://myaccount.blob.core.windows.net/backups/')
    expect(templateLocation(DRIVE)).toBe('Photos')
    expect(locationInput(DRIVE)).toBe('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp')
    expect(driveFolderInput('root')).toBe('My Drive')
    expect([S3, AZURE, DRIVE].map(rootLabel)).toEqual(['b1', 'backups', 'Photos'])
  })
})

describe('formatLocation', () => {
  it('names a typed-in Drive folder without knowing its name yet', () => {
    expect(formatLocation({ platform: 'google-drive', folderId: 'root' })).toBe('My Drive')
    expect(formatLocation({ platform: 'google-drive', folderId: '1AbCdEfGhIjKlMnOp' })).toBe(
      'the Drive folder in that link'
    )
  })
})
