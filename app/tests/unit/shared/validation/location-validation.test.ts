import { describe, expect, it } from 'vitest'
import {
  kindProblem,
  parseAzureLocation,
  parseDriveLocation,
  parseLocation,
  parseS3Location
} from '../../../../src/shared/validation/location-validation'

describe('parseS3Location', () => {
  it('reads a bucket and folder, with or without s3://', () => {
    for (const input of ['s3://my-bucket/a/b/', 'my-bucket/a/b', '  S3://my-bucket//a/b  ']) {
      expect(parseS3Location(input), input).toEqual({
        location: { platform: 's3', bucket: 'my-bucket', prefix: 'a/b/' }
      })
    }
  })

  it('reads a whole bucket', () => {
    for (const input of ['s3://my.bucket', 'my.bucket/', 's3://my.bucket/']) {
      expect(parseS3Location(input), input).toEqual({
        location: { platform: 's3', bucket: 'my.bucket', prefix: '' }
      })
    }
  })

  it('rejects invalid bucket names', () => {
    for (const input of ['', 's3://', 'My-Bucket', 'ab', '-bucket', 'a..b', '192.168.1.1', 'a_b']) {
      expect(parseS3Location(input), input).toHaveProperty('error')
    }
  })
})

describe('parseAzureLocation', () => {
  it('reads the account, container and folder from the container URL, with or without https://', () => {
    for (const input of [
      'https://myaccount.blob.core.windows.net/backups/a/b/',
      'myaccount.blob.core.windows.net/backups/a/b',
      '  HTTPS://MyAccount.blob.core.windows.net//backups/a/b  '
    ]) {
      expect(parseAzureLocation(input), input).toEqual({
        location: { platform: 'azure', account: 'myaccount', container: 'backups', prefix: 'a/b/' }
      })
    }
  })

  it('needs the blob endpoint, a valid account and a container', () => {
    expect(parseAzureLocation('https://example.com/backups')).toHaveProperty('error')
    expect(parseAzureLocation('https://my_account.blob.core.windows.net/x')).toHaveProperty('error')
    expect(parseAzureLocation('https://myaccount.blob.core.windows.net/')).toEqual({
      error:
        'Add the container after the account, such as myaccount.blob.core.windows.net/backups/.'
    })
    for (const container of ['Backups', 'a', 'my--box', '-box']) {
      expect(
        parseAzureLocation(`https://myaccount.blob.core.windows.net/${container}`),
        container
      ).toHaveProperty('error')
    }
  })
})

describe('parseDriveLocation', () => {
  it('reads a folder link, a bare folder ID, or My Drive', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUv'
    for (const input of [
      `https://drive.google.com/drive/folders/${id}`,
      `https://drive.google.com/drive/u/1/folders/${id}?usp=sharing`,
      `drive.google.com/drive/folders/${id}`,
      id
    ]) {
      expect(parseDriveLocation(input), input).toEqual({
        location: { platform: 'google-drive', folderId: id }
      })
    }
    expect(parseDriveLocation(' my drive ')).toEqual({
      location: { platform: 'google-drive', folderId: 'root' }
    })
  })

  it('rejects anything else', () => {
    for (const input of ['', 'https://example.com/folders/abc', 'short', "a'b and c"]) {
      expect(parseDriveLocation(input), input).toHaveProperty('error')
    }
  })
})

describe('parseLocation and kindProblem', () => {
  it("parse each platform's location, and need a whole bucket or container to download", () => {
    expect(parseLocation('s3', 's3://b1x/a/')).toHaveProperty('location.platform', 's3')
    expect(parseLocation('azure', 'acct.blob.core.windows.net/box')).toHaveProperty(
      'location.platform',
      'azure'
    )
    expect(parseLocation('google-drive', 'My Drive')).toHaveProperty(
      'location.platform',
      'google-drive'
    )
    expect(kindProblem({ platform: 's3', bucket: 'b', prefix: 'a/' }, 'download')).toContain(
      'whole bucket'
    )
    expect(
      kindProblem({ platform: 'azure', account: 'a', container: 'c', prefix: 'a/' }, 'download')
    ).toContain('whole container')
    expect(
      kindProblem({ platform: 'azure', account: 'a', container: 'c', prefix: 'a/' }, 'upload')
    ).toBeNull()
    expect(kindProblem({ platform: 'google-drive', folderId: 'x' }, 'download')).toBeNull()
  })
})
