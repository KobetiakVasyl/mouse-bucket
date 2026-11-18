import { describe, expect, it } from 'vitest'
import type { Template } from '../../../../../src/shared/types/template-types'
import { EMPTY_TEMPLATE_FORM } from '../../../../../src/renderer/src/constants/template-constants'
import type { TemplateFormValues } from '../../../../../src/renderer/src/types/template-form-types'
import {
  accessHint,
  copySourcesFor,
  formFor,
  isCopyingKeys,
  locationHint,
  newTemplate,
  signsIn,
  templateEdit
} from '../../../../../src/renderer/src/utils/template-form-utils'

const form = (change: Partial<TemplateFormValues>): TemplateFormValues => ({
  ...EMPTY_TEMPLATE_FORM,
  ...change
})

const saved: Template = {
  id: '6f1c2b8e-4a3d-4f5e-9b7a-1c2d3e4f5a6b',
  name: 'Reports',
  kind: 'upload',
  platform: 's3',
  bucket: 'example-bucket',
  prefix: 'reports/',
  region: 'eu-west-1'
}

describe('locationHint', () => {
  it('gives an example until something is typed', () => {
    expect(locationHint(form({ kind: 'upload' }))).toBe('For example s3://my-bucket/folder/')
    expect(locationHint(form({ kind: 'download' }))).toBe('For example s3://my-bucket')
  })

  it('says where uploads go and what downloads browse', () => {
    expect(locationHint(form({ location: 'my-bucket/a' }))).toBe('Uploads go to s3://my-bucket/a/')
    expect(locationHint(form({ kind: 'download', location: 's3://my-bucket' }))).toBe(
      'Downloads browse s3://my-bucket/'
    )
  })

  it('explains what is wrong with the location', () => {
    expect(locationHint(form({ location: 'Not A Bucket' }))).toBe(
      '"Not A Bucket" isn\'t a valid bucket name.'
    )
    expect(locationHint(form({ kind: 'download', location: 's3://my-bucket/a/' }))).toBe(
      'A download template points at a whole bucket. Remove the folder.'
    )
  })

  it('explains Azure container URLs and Google Drive folder links', () => {
    const azure = form({ platform: 'azure', location: 'myaccount.blob.core.windows.net/backups/a' })
    expect(locationHint(azure)).toBe(
      'Uploads go to https://myaccount.blob.core.windows.net/backups/a/'
    )
    expect(locationHint({ ...azure, kind: 'download' })).toContain('whole container')
    const drive = form({ platform: 'google-drive', kind: 'download', location: 'My Drive' })
    expect(locationHint(drive)).toBe('Downloads browse My Drive')
    expect(locationHint({ ...drive, location: 'not a link' })).toContain("folder's link")
  })
})

describe('accessHint', () => {
  it('names what the keys need on each platform', () => {
    expect(accessHint(form({}))).toMatch(/^The IAM user needs s3:PutObject/)
    expect(accessHint(form({ platform: 'azure' }))).toContain('whole storage account')
    expect(accessHint(form({ platform: 'google-drive', kind: 'download' }))).toContain(
      'see, download and delete'
    )
  })
})

describe('newTemplate', () => {
  const typed = form({
    name: 'Invoices',
    location: 's3://example-bucket/invoices/',
    accessKeyId: 'AKIAEXAMPLEKEY000001',
    secretAccessKey: 'example-secret'
  })

  it('sends the typed keys', () => {
    expect(newTemplate(typed, [saved])).toEqual({
      platform: 's3',
      kind: 'upload',
      name: 'Invoices',
      location: 's3://example-bucket/invoices/',
      keys: {
        source: 'entered',
        secrets: {
          platform: 's3',
          accessKeyId: 'AKIAEXAMPLEKEY000001',
          secretAccessKey: 'example-secret'
        }
      }
    })
  })

  it("sends each platform's own keys, and signs in only for a typed-in Google client", () => {
    const azure = form({ platform: 'azure', accountKey: 'key==' })
    expect(newTemplate(azure, []).keys).toEqual({
      source: 'entered',
      secrets: { platform: 'azure', accountKey: 'key==' }
    })
    const drive = form({ platform: 'google-drive', clientId: 'id', clientSecret: 'secret' })
    expect(newTemplate(drive, []).keys).toEqual({
      source: 'entered',
      secrets: { platform: 'google-drive', clientId: 'id', clientSecret: 'secret' }
    })
    expect(signsIn(drive, [])).toBe(true)
    expect(signsIn({ ...drive, keySource: 'copied' }, [saved])).toBe(false)
    expect(signsIn(azure, [])).toBe(false)
  })

  it('copies keys only from templates on the same platform, and never from itself', () => {
    const drive: Template = {
      id: '9b3e5d7f-3d4c-4e5f-8a0b-2c3d4e5f6a7b',
      name: 'Family',
      kind: 'download',
      platform: 'google-drive',
      folderId: 'root',
      folderName: 'My Drive'
    }
    expect(copySourcesFor(form({}), [saved, drive], null)).toEqual([saved])
    expect(copySourcesFor(form({}), [saved, drive], saved.id)).toEqual([])
    expect(copySourcesFor(form({ platform: 'google-drive' }), [saved, drive], null)).toEqual([
      drive
    ])
  })

  it('names the template to copy the keys of, or the first by name when none is chosen', () => {
    const copying = { ...typed, keySource: 'copied' as const }
    expect(newTemplate(copying, [saved]).keys).toEqual({ source: 'copied', templateId: saved.id })
  })

  it('sends the typed keys while there is no template to copy from', () => {
    const copying = { ...typed, keySource: 'copied' as const }
    expect(isCopyingKeys(copying, [])).toBe(false)
    expect(newTemplate(copying, []).keys.source).toBe('entered')
  })
})

describe('formFor and templateEdit', () => {
  it('starts from the template, keeping its keys', () => {
    expect(formFor(saved)).toEqual({
      ...EMPTY_TEMPLATE_FORM,
      kind: 'upload',
      name: 'Reports',
      location: 's3://example-bucket/reports/',
      keySource: 'kept'
    })
    expect(templateEdit({ ...formFor(saved), name: 'New name' }, saved.id, [])).toEqual({
      id: saved.id,
      platform: 's3',
      kind: 'upload',
      name: 'New name',
      location: 's3://example-bucket/reports/',
      keys: { source: 'kept' }
    })
  })

  it('sends new keys, typed in or copied', () => {
    const typed = {
      ...formFor(saved),
      keySource: 'entered',
      accessKeyId: 'AKIA1',
      secretAccessKey: 's'
    } as const
    expect(templateEdit(typed, saved.id, []).keys).toEqual({
      source: 'entered',
      secrets: { platform: 's3', accessKeyId: 'AKIA1', secretAccessKey: 's' }
    })
    const other = { ...saved, id: '7a2d3c9f-5b4e-4a6f-8c8b-2d3e4f5a6b7c', name: 'Other' }
    const copied = { ...formFor(saved), keySource: 'copied', copyFrom: other.id } as const
    expect(templateEdit(copied, saved.id, [other]).keys).toEqual({
      source: 'copied',
      templateId: other.id
    })
  })
})
