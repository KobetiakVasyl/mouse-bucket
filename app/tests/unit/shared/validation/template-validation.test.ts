import { describe, expect, it } from 'vitest'
import {
  NewTemplateSchema,
  TemplateSchema
} from '../../../../src/shared/validation/template-validation'

const NEW = {
  name: 'Backups',
  kind: 'upload',
  platform: 'azure',
  location: 'https://myaccount.blob.core.windows.net/backups/',
  keys: { source: 'entered', secrets: { platform: 'azure', accountKey: `${'A'.repeat(86)}==` } }
}

describe('NewTemplateSchema', () => {
  it("takes each platform's own keys, and refuses keys for another platform", () => {
    expect(NewTemplateSchema.safeParse(NEW).success).toBe(true)
    const mismatched = {
      ...NEW,
      platform: 's3',
      location: 's3://bucket-one'
    }
    const parsed = NewTemplateSchema.safeParse(mismatched)
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0].message).toBe("The keys don't match the platform.")
  })

  it('checks the shape of Azure keys and Google OAuth clients', () => {
    const badKey = {
      ...NEW,
      keys: { source: 'entered', secrets: { platform: 'azure', accountKey: 'short' } }
    }
    expect(NewTemplateSchema.safeParse(badKey).error?.issues[0].message).toBe(
      "That doesn't look like a storage account key."
    )
    const drive = {
      ...NEW,
      platform: 'google-drive',
      location: 'My Drive',
      keys: {
        source: 'entered',
        secrets: { platform: 'google-drive', clientId: 'not-a-client', clientSecret: 's' }
      }
    }
    expect(NewTemplateSchema.safeParse(drive).error?.issues[0].message).toBe(
      "That doesn't look like an OAuth client ID."
    )
  })
})

describe('TemplateSchema', () => {
  it('reads a template saved without a platform as an S3 one', () => {
    const old = {
      id: '6f1c2b8e-4a3d-4f5e-9b7a-1c2d3e4f5a6b',
      name: 'Old',
      kind: 'download',
      bucket: 'b1',
      prefix: '',
      region: 'eu-west-1'
    }
    expect(TemplateSchema.parse(old)).toEqual({ ...old, platform: 's3' })
  })
})
