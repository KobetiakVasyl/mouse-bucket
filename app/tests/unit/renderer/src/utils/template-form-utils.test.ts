import { describe, expect, it } from 'vitest'
import type { Template } from '../../../../../src/shared/types/template-types'
import { EMPTY_TEMPLATE_FORM } from '../../../../../src/renderer/src/constants/template-constants'
import type { TemplateFormValues } from '../../../../../src/renderer/src/types/template-form-types'
import {
  isCopyingKeys,
  locationHint,
  newTemplate
} from '../../../../../src/renderer/src/utils/template-form-utils'

const form = (change: Partial<TemplateFormValues>): TemplateFormValues => ({
  ...EMPTY_TEMPLATE_FORM,
  ...change
})

const saved: Template = {
  id: '6f1c2b8e-4a3d-4f5e-9b7a-1c2d3e4f5a6b',
  name: 'Reports',
  kind: 'upload',
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
      kind: 'upload',
      name: 'Invoices',
      location: 's3://example-bucket/invoices/',
      keys: {
        source: 'entered',
        accessKeyId: 'AKIAEXAMPLEKEY000001',
        secretAccessKey: 'example-secret'
      }
    })
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
