// Talks to S3: finds a bucket's region, lists a folder, uploads and downloads files from where they stopped, deletes and restores them. See docs/ARCHITECTURE.md.
import { createWriteStream } from 'node:fs'
import { rename } from 'node:fs/promises'
import { Readable, Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  RestoreObjectCommand,
  S3Client,
  UploadPartCommand
} from '@aws-sdk/client-s3'
import { UPLOAD_CHECKSUM } from '../../shared/constants/storage-constants'
import type { FolderListing, RestoreTier, UploadStorageClass } from '../../shared/types/s3-types'
import { DISCOVERY_REGION, PART_FILE_SUFFIX, UPLOAD_QUEUE_SIZE } from '../constants/s3-constants'
import type { BucketAccess, Credentials } from '../types/credential-types'
import type { DownloadFileOptions, UploadFileOptions } from '../types/s3-service-types'
import type { UploadPart } from '../types/transfer-queue-types'
import { httpStatusOf, UserError } from '../utils/error-utils'
import { readRange, sizeOrZero } from '../utils/file-utils'
import { forEachLimited } from '../utils/poll-utils'
import {
  bucketRegionHeader,
  filesOf,
  foldersOf,
  partCount,
  partRange,
  partsBytes
} from '../utils/s3-utils'

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

  // Sends one local file in the chosen storage class with a CRC64NVME checksum. A file over one part goes as a
  // multipart upload that sends only the parts S3 doesn't have yet, and reports each new one so it can be saved.
  uploadFile(access: BucketAccess, options: UploadFileOptions): Promise<void> {
    const { key, storageClass, filePath, fileSize, partSize, signal, onProgress } = options
    return this.withBucket(access, async (client) => {
      signal.throwIfAborted()
      if (fileSize <= partSize) {
        const body = await readRange(filePath, 0, fileSize)
        await client.send(
          new PutObjectCommand({
            Bucket: access.bucket,
            Key: key,
            Body: body,
            StorageClass: storageClass,
            ChecksumAlgorithm: UPLOAD_CHECKSUM
          }),
          { abortSignal: signal }
        )
        onProgress(fileSize)
        return
      }
      await this.uploadParts(client, access.bucket, options)
    })
  }

  // Stops a multipart upload, so S3 deletes its parts and stops billing them.
  abortUpload(access: BucketAccess, key: string, uploadId: string): Promise<void> {
    return this.withBucket(access, async (client) => {
      await client.send(
        new AbortMultipartUploadCommand({ Bucket: access.bucket, Key: key, UploadId: uploadId })
      )
    })
  }

  // Streams one object into a .part file that becomes the target only once complete. A .part file left by an earlier
  // run is continued with a range request, which S3 answers only while the object is still the version it came from.
  downloadFile(access: BucketAccess, options: DownloadFileOptions): Promise<void> {
    const { key, targetPath, etag, bytesTotal, signal, onStart, onProgress } = options
    const partPath = `${targetPath}${PART_FILE_SUFFIX}`
    return this.withBucket(access, async (client) => {
      let offset = etag === null ? 0 : await sizeOrZero(partPath)
      if (etag !== null && bytesTotal !== null && offset === bytesTotal && offset > 0) {
        await rename(partPath, targetPath)
        return
      }
      if (bytesTotal !== null && offset > bytesTotal) offset = 0

      let response: GetObjectCommandOutput
      try {
        response = await this.getObject(client, access.bucket, key, offset, etag, signal)
      } catch (error) {
        // 412: the object changed since the download began. 416: the .part is longer than it. Either way, start over.
        const status = httpStatusOf(error)
        if (offset === 0 || (status !== 412 && status !== 416)) throw error
        offset = 0
        response = await this.getObject(client, access.bucket, key, 0, null, signal)
      }
      const body = response.Body
      if (!(body instanceof Readable)) throw new Error('S3 returned no file content.')
      if (response.ContentLength === undefined || response.ETag === undefined) {
        throw new Error("S3 didn't say how large the file is.")
      }

      const total = offset + response.ContentLength
      onStart(response.ETag, total)
      let bytesDone = offset
      onProgress(bytesDone, total)
      const counter = new Transform({
        transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
          bytesDone += chunk.length
          onProgress(bytesDone, total)
          callback(null, chunk)
        }
      })
      const flags = offset > 0 ? 'a' : 'w'
      await pipeline(body, counter, createWriteStream(partPath, { flags }), { signal })
      await rename(partPath, targetPath)
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

  private async uploadParts(
    client: S3Client,
    bucket: string,
    options: UploadFileOptions
  ): Promise<void> {
    const {
      key,
      storageClass,
      filePath,
      fileSize,
      partSize,
      signal,
      onCreated,
      onPart,
      onProgress
    } = options
    const uploadId =
      options.uploadId === null
        ? await this.createUpload(client, bucket, key, storageClass, signal)
        : options.uploadId
    if (options.uploadId === null) onCreated(uploadId)

    const parts = new Map(options.parts.map((part) => [part.partNumber, part]))
    let bytesDone = partsBytes([...parts.keys()], partSize, fileSize)
    onProgress(bytesDone)
    const missing = Array.from(
      { length: partCount(fileSize, partSize) },
      (_, index) => index + 1
    ).filter((partNumber) => !parts.has(partNumber))

    await forEachLimited(missing, UPLOAD_QUEUE_SIZE, async (partNumber) => {
      const { start, length } = partRange(partNumber, partSize, fileSize)
      const output = await client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: await readRange(filePath, start, length),
          ChecksumAlgorithm: UPLOAD_CHECKSUM
        }),
        { abortSignal: signal }
      )
      if (output.ETag === undefined || output.ChecksumCRC64NVME === undefined) {
        throw new Error(`S3 didn't confirm part ${partNumber} of the upload.`)
      }
      const part: UploadPart = { partNumber, etag: output.ETag, checksum: output.ChecksumCRC64NVME }
      parts.set(partNumber, part)
      onPart(part)
      bytesDone += length
      onProgress(bytesDone)
    })

    const sorted = [...parts.values()].sort((a, b) => a.partNumber - b.partNumber)
    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sorted.map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
            ChecksumCRC64NVME: part.checksum
          }))
        }
      }),
      { abortSignal: signal }
    )
  }

  // No encryption header, so the bucket's default encryption applies.
  private async createUpload(
    client: S3Client,
    bucket: string,
    key: string,
    storageClass: UploadStorageClass,
    signal: AbortSignal
  ): Promise<string> {
    const output = await client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        StorageClass: storageClass,
        ChecksumAlgorithm: UPLOAD_CHECKSUM
      }),
      { abortSignal: signal }
    )
    if (output.UploadId === undefined) throw new Error("S3 didn't start the upload.")
    return output.UploadId
  }

  private getObject(
    client: S3Client,
    bucket: string,
    key: string,
    offset: number,
    etag: string | null,
    signal: AbortSignal
  ): Promise<GetObjectCommandOutput> {
    const resume = offset > 0 && etag !== null ? { Range: `bytes=${offset}-`, IfMatch: etag } : {}
    return client.send(new GetObjectCommand({ Bucket: bucket, Key: key, ...resume }), {
      abortSignal: signal
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
