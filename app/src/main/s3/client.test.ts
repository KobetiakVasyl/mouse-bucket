import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createS3Client, detectBucketRegion } from './client'

const s3 = mockClient(S3Client)
const KEYS = { accessKeyId: 'AKIAEXAMPLEKEY000001', secretAccessKey: 'secret' }

const failure = (status: number, headers: Record<string, string>): Error =>
  Object.assign(new Error('failed'), {
    name: status === 404 ? 'NotFound' : 'Forbidden',
    $metadata: { httpStatusCode: status },
    $response: { statusCode: status, headers }
  })

beforeEach(() => {
  s3.reset()
})
afterAll(() => {
  s3.restore()
})

describe('detectBucketRegion', () => {
  it('uses the region S3 reports for a bucket the keys can see', async () => {
    s3.on(HeadBucketCommand, { Bucket: 'b1' }).resolves({ BucketRegion: 'eu-west-1' })
    expect(await detectBucketRegion(createS3Client('us-east-1', KEYS), 'b1')).toBe('eu-west-1')
  })

  it('reads the region from a denied request, so upload-only keys work', async () => {
    s3.on(HeadBucketCommand).rejects(failure(403, { 'x-amz-bucket-region': 'ap-south-1' }))
    expect(await detectBucketRegion(createS3Client('us-east-1', KEYS), 'b1')).toBe('ap-south-1')
  })

  it('fails for a bucket that does not exist', async () => {
    s3.on(HeadBucketCommand).rejects(failure(404, { 'x-amz-bucket-region': 'us-east-1' }))
    await expect(detectBucketRegion(createS3Client('us-east-1', KEYS), 'b1')).rejects.toThrow()
  })

  it('fails when S3 names no region', async () => {
    s3.on(HeadBucketCommand).rejects(failure(403, {}))
    await expect(detectBucketRegion(createS3Client('us-east-1', KEYS), 'b1')).rejects.toThrow()
  })
})
