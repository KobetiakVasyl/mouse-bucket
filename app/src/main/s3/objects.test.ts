import { DeleteObjectCommand, RestoreObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { describeError } from '../errors'
import { deleteObject, restoreObject } from './objects'

const s3 = mockClient(S3Client)
const client = new S3Client({
  region: 'eu-west-1',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }
})

beforeEach(() => {
  s3.reset()
})
afterAll(() => {
  s3.restore()
})

describe('deleteObject', () => {
  it('deletes exactly the given key', async () => {
    s3.on(DeleteObjectCommand).resolves({})
    await deleteObject(client, 'b1', 'a/old.pdf')
    expect(s3.commandCalls(DeleteObjectCommand)[0].args[0].input).toEqual({
      Bucket: 'b1',
      Key: 'a/old.pdf'
    })
  })
})

describe('restoreObject', () => {
  it('asks for a restore with the chosen tier and number of days', async () => {
    s3.on(RestoreObjectCommand).resolves({})
    await restoreObject(client, 'b1', 'cold.zip', 'Bulk', 7)
    expect(s3.commandCalls(RestoreObjectCommand)[0].args[0].input).toEqual({
      Bucket: 'b1',
      Key: 'cold.zip',
      RestoreRequest: { Days: 7, GlacierJobParameters: { Tier: 'Bulk' } }
    })
  })

  it('explains a restore that is already running', async () => {
    s3.on(RestoreObjectCommand).rejects(
      Object.assign(new Error('x'), { name: 'RestoreAlreadyInProgress' })
    )
    const failure = await restoreObject(client, 'b1', 'cold.zip', 'Standard', 1).catch(
      (error: unknown) => describeError(error)
    )
    expect(failure).toBe('A restore of this file is already in progress.')
  })
})
