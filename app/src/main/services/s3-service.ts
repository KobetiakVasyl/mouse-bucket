// Talks to S3: finds a bucket's region, lists a folder, uploads, downloads, deletes and restores files. See docs/ARCHITECTURE.md.
import { createReadStream, createWriteStream } from 'node:fs'
import { rename, rm } from 'node:fs/promises'
import { Readable, Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  RestoreObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { UPLOAD_CHECKSUM, UPLOAD_STORAGE_CLASS } from '../../shared/constants/storage-constants'
import type { FolderListing, RestoreTier } from '../../shared/types/s3-types'
import { DISCOVERY_REGION, PART_FILE_SUFFIX, UPLOAD_QUEUE_SIZE } from '../constants/s3-constants'
import type { BucketAccess, Credentials } from '../types/credential-types'
import type { DownloadFileOptions, UploadFileOptions } from '../types/s3-service-types'
import { httpStatusOf, UserError } from '../utils/error-utils'
import { bucketRegionHeader, filesOf, foldersOf, partSizeFor } from '../utils/s3-utils'

export class S3Service {
  // S3 names the bucket's region even to keys that may not list it, so upload-only keys work too.
  findRegion(credentials: Credentials, bucket: string): Promise<string> {
    return this.withClient(DISCOVERY_REGION, credentials, async (client) => {
      try {
        const output = await client.send(new HeadBucketCommand({ Bucket: bucket }))
        if (output.BucketRegion === undefined) {
          throw new UserError("S3 didn't name the bucket's region.")
        }
        return output.BucketRegion
      } catch (error) {
        const region = bucketRegionHeader(error)
        if (region !== '' && httpStatusOf(error) !== 404) return region
        throw error
      }
    })
  }

  // One folder level: its subfolders, and its files with their storage class and restore state.
  listFolder(
    access: BucketAccess,
    prefix: string,
    continuationToken: string | null
  ): Promise<FolderListing> {
    return this.withBucket(access, async (client) => {
      const output = await client.send(
        new ListObjectsV2Command({
          Bucket: access.bucket,
          Prefix: prefix,
          Delimiter: '/',
          ContinuationToken: continuationToken === null ? undefined : continuationToken,
          OptionalObjectAttributes: ['RestoreStatus']
        })
      )
      const token = output.NextContinuationToken
      return {
        folders: foldersOf(output.CommonPrefixes),
        files: filesOf(output.Contents, prefix),
        nextToken: output.IsTruncated === true && token !== undefined ? token : null
      }
    })
  }

  // Sends one local file as Glacier Deep Archive with a CRC64NVME checksum, in parts for large files.
  uploadFile(access: BucketAccess, options: UploadFileOptions): Promise<void> {
    const { key, filePath, fileSize, signal, onProgress } = options
    return this.withBucket(access, async (client) => {
      signal.throwIfAborted()
      const body = createReadStream(filePath)
      const upload = new Upload({
        client,
        // No encryption header, so the bucket's default encryption applies.
        params: {
          Bucket: access.bucket,
          Key: key,
          Body: body,
          StorageClass: UPLOAD_STORAGE_CLASS,
          ChecksumAlgorithm: UPLOAD_CHECKSUM
        },
        partSize: partSizeFor(fileSize),
        queueSize: UPLOAD_QUEUE_SIZE,
        leavePartsOnError: false
      })
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded !== undefined) onProgress(progress.loaded)
      })
      const abort = (): void => {
        void upload.abort()
      }
      signal.addEventListener('abort', abort, { once: true })
      try {
        await upload.done()
      } finally {
        signal.removeEventListener('abort', abort)
        body.destroy()
      }
    })
  }

  // Streams one object into a .part file that replaces the chosen file only once complete.
  downloadFile(access: BucketAccess, options: DownloadFileOptions): Promise<void> {
    const { key, targetPath, signal, onProgress } = options
    return this.withBucket(access, async (client) => {
      const response = await client.send(
        new GetObjectCommand({ Bucket: access.bucket, Key: key }),
        { abortSignal: signal }
      )
      const body = response.Body
      const bytesTotal = response.ContentLength
      if (!(body instanceof Readable)) throw new Error('S3 returned no file content.')
      if (bytesTotal === undefined) throw new Error("S3 didn't say how large the file is.")

      let bytesDone = 0
      onProgress(0, bytesTotal)
      const counter = new Transform({
        transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
          bytesDone += chunk.length
          onProgress(bytesDone, bytesTotal)
          callback(null, chunk)
        }
      })

      const partPath = `${targetPath}${PART_FILE_SUFFIX}`
      try {
        await pipeline(body, counter, createWriteStream(partPath), { signal })
        await rename(partPath, targetPath)
      } catch (error) {
        await rm(partPath, { force: true })
        throw error
      }
    })
  }

  deleteFile(access: BucketAccess, key: string): Promise<void> {
    return this.withBucket(access, async (client) => {
      await client.send(new DeleteObjectCommand({ Bucket: access.bucket, Key: key }))
    })
  }

  // Asks S3 for a temporary copy of an archived file, kept for the given number of days.
  restoreFile(access: BucketAccess, key: string, tier: RestoreTier, days: number): Promise<void> {
    return this.withBucket(access, async (client) => {
      await client.send(
        new RestoreObjectCommand({
          Bucket: access.bucket,
          Key: key,
          RestoreRequest: { Days: days, GlacierJobParameters: { Tier: tier } }
        })
      )
    })
  }

  private withBucket<T>(access: BucketAccess, work: (client: S3Client) => Promise<T>): Promise<T> {
    return this.withClient(access.region, access.credentials, work)
  }

  // Each call gets its own client, destroyed afterwards, so no client keeps the keys.
  private async withClient<T>(
    region: string,
    credentials: Credentials,
    work: (client: S3Client) => Promise<T>
  ): Promise<T> {
    const client = new S3Client({ region, credentials, followRegionRedirects: true })
    try {
      return await work(client)
    } finally {
      client.destroy()
    }
  }
}
