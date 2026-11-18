// Creates S3 clients for a template, and finds a bucket's region when a template is added. See docs/ARCHITECTURE.md.
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { httpStatusOf, propertyOf, UserError } from '../errors'
import type { Credentials } from '../templates'

// Any region works for the first request: S3 answers with the bucket's real region.
export const DISCOVERY_REGION = 'us-east-1'

export function createS3Client(region: string, credentials: Credentials): S3Client {
  return new S3Client({ region, credentials, followRegionRedirects: true })
}

// The x-amz-bucket-region header of a failed request, or '' when it has none.
function bucketRegionHeader(error: unknown): string {
  const headers = propertyOf(propertyOf(error, '$response'), 'headers')
  const region = propertyOf(headers, 'x-amz-bucket-region')
  return typeof region === 'string' ? region : ''
}

// S3 names the bucket's region even to keys that may not list it, so upload-only keys work too.
export async function detectBucketRegion(client: S3Client, bucket: string): Promise<string> {
  try {
    const output = await client.send(new HeadBucketCommand({ Bucket: bucket }))
    if (output.BucketRegion === undefined)
      throw new UserError("S3 didn't name the bucket's region.")
    return output.BucketRegion
  } catch (error) {
    const region = bucketRegionHeader(error)
    if (region !== '' && httpStatusOf(error) !== 404) return region
    throw error
  }
}
