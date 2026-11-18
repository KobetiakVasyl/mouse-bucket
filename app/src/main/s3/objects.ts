// Deletes one object, or asks S3 to restore an archived one for a number of days. See docs/ARCHITECTURE.md.
import { DeleteObjectCommand, RestoreObjectCommand, type S3Client } from '@aws-sdk/client-s3'
import type { RestoreTier } from '../../shared/ipc'

export async function deleteObject(client: S3Client, bucket: string, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export async function restoreObject(
  client: S3Client,
  bucket: string,
  key: string,
  tier: RestoreTier,
  days: number
): Promise<void> {
  await client.send(
    new RestoreObjectCommand({
      Bucket: bucket,
      Key: key,
      RestoreRequest: { Days: days, GlacierJobParameters: { Tier: tier } }
    })
  )
}
