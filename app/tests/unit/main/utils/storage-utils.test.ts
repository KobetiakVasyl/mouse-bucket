import { describe, expect, it } from 'vitest'
import {
  accessFor,
  accessTierOf,
  checkUploadClass,
  keptTarget,
  placeOf,
  prefixFolder,
  s3ClassOf
} from '../../../../src/main/utils/storage-utils'
import type { Template } from '../../../../src/shared/types/template-types'

const base = { id: '6f1c2b8e-4a3d-4f5e-9b7a-1c2d3e4f5a6b', name: 'T', kind: 'upload' } as const
const S3: Template = { ...base, platform: 's3', bucket: 'b1', prefix: 'a/', region: 'eu-west-1' }
const AZURE: Template = {
  ...base,
  platform: 'azure',
  account: 'myaccount',
  container: 'backups',
  prefix: 'a/'
}
const DRIVE: Template = {
  ...base,
  platform: 'google-drive',
  folderId: '1AbCdEfGhIjKlMnOp',
  folderName: 'Photos'
}
const S3_KEYS = { platform: 's3', accessKeyId: 'AKIA', secretAccessKey: 's' } as const
const AZURE_KEY = { platform: 'azure', accountKey: 'key' } as const

describe('placeOf and accessFor', () => {
  it('keep where each template points, without its folder', () => {
    expect(placeOf(S3)).toEqual({ platform: 's3', bucket: 'b1', region: 'eu-west-1' })
    expect(placeOf(AZURE)).toEqual({
      platform: 'azure',
      account: 'myaccount',
      container: 'backups'
    })
    expect(placeOf(DRIVE)).toEqual({ platform: 'google-drive', folderId: '1AbCdEfGhIjKlMnOp' })
  })

  it('pair a place with keys only for the same platform', () => {
    expect(accessFor(placeOf(AZURE), AZURE_KEY)).toEqual({
      platform: 'azure',
      account: 'myaccount',
      container: 'backups',
      credentials: AZURE_KEY
    })
    expect(accessFor(placeOf(S3), S3_KEYS)).toMatchObject({ bucket: 'b1', credentials: S3_KEYS })
    expect(() => accessFor(placeOf(S3), AZURE_KEY)).toThrow('another platform')
  })
})

describe('storage classes', () => {
  it("take only S3's classes for S3, Azure's tiers for Azure, and none for Google Drive", () => {
    expect(s3ClassOf('STANDARD')).toBe('STANDARD')
    expect(() => s3ClassOf('Archive')).toThrow('S3 storage class')
    expect(accessTierOf('Cool')).toBe('Cool')
    expect(() => accessTierOf(null)).toThrow('Azure access tier')
    expect(() => checkUploadClass('google-drive', null)).not.toThrow()
    expect(() => checkUploadClass('google-drive', 'Hot')).toThrow('no storage classes')
    expect(() => checkUploadClass('azure', 'DEEP_ARCHIVE')).toThrow('Azure access tier')
  })
})

describe('prefixFolder', () => {
  it('opens a folder by its prefix and names it by its last part', () => {
    expect(prefixFolder('photos/2025/', 'photos/')).toEqual({ id: 'photos/2025/', name: '2025' })
  })
})

describe('keptTarget', () => {
  it('keeps what the platform said while the bucket, container or folder stays the same', () => {
    expect(keptTarget(S3, { platform: 's3', bucket: 'b1', prefix: 'b/' })).toEqual({
      platform: 's3',
      bucket: 'b1',
      prefix: 'b/',
      region: 'eu-west-1'
    })
    expect(keptTarget(S3, { platform: 's3', bucket: 'b2', prefix: '' })).toBeNull()
    expect(
      keptTarget(AZURE, {
        platform: 'azure',
        account: 'myaccount',
        container: 'backups',
        prefix: ''
      })
    ).toEqual({ platform: 'azure', account: 'myaccount', container: 'backups', prefix: '' })
    expect(
      keptTarget(AZURE, { platform: 'azure', account: 'other', container: 'backups', prefix: '' })
    ).toBeNull()
    expect(keptTarget(DRIVE, { platform: 'google-drive', folderId: DRIVE.folderId })).toEqual({
      platform: 'google-drive',
      folderId: DRIVE.folderId,
      folderName: 'Photos'
    })
    expect(keptTarget(S3, { platform: 'google-drive', folderId: 'root' })).toBeNull()
  })
})
