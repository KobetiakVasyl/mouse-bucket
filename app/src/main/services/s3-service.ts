// Talks to S3: finds a bucket's region, lists a folder, uploads and downloads files from where they stopped, deletes and
// restores them. See docs/ARCHITECTURE.md.
import { Readable } from 'node:stream'
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  type _Object,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  RestoreObjectCommand,
  S3Client,
  UploadPartCommand
} from '@aws-sdk/client-s3'
import { UPLOAD_CHECKSUM } from '../../shared/constants/storage-constants'
import type {
  FolderListing,
  RestoreTier,
  UploadStorageClass
} from '../../shared/types/storage-types'
import { PARTS_AT_ONCE } from '../constants/part-constants'
import { S3_DELETE_BATCH } from '../constants/folder-constants'
import { DISCOVERY_REGION } from '../constants/s3-constants'
import type { S3Access, S3Credentials } from '../types/credential-types'
import type {
  DownloadFileOptions,
  PlatformStorage,
  TreeFile,
  UploadFileOptions
} from '../types/storage-service-types'
import type { UploadPart } from '../types/transfer-queue-types'
import { httpStatusOf, propertyOf, UploadExpiredError, UserError } from '../utils/error-utils'
import { resumeOffset, saveDownload } from '../utils/download-utils'
import { readRange } from '../utils/file-utils'
import { partNumbers, partRange, partsBytes } from '../utils/part-utils'
import { forEachLimited } from '../utils/poll-utils'
import { bucketRegionHeader, filesOf, foldersOf } from '../utils/s3-utils'
import { checkFolderPrefix, prefixName, s3ClassOf } from '../utils/storage-utils'

export class S3Service implements PlatformStorage<S3Access> {
  // S3 names the bucket's region even to keys that may not list it, so upload-only keys work too.
  findRegion(credentials: S3Credentials, bucket: string): Promise<string> {
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
    access: S3Access,
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
        folders: foldersOf(output.CommonPrefixes, prefix),
        files: filesOf(output.Contents, prefix),
        nextToken: output.IsTruncated === true && token !== undefined ? token : null
      }
    })
  }

  // Sends one local file in the chosen storage class with a CRC64NVME checksum. A file over one part goes as a
  // multipart upload that sends only the parts S3 doesn't have yet, and reports each new one so it can be saved.
  uploadFile(access: S3Access, options: UploadFileOptions): Promise<void> {
    const { key, filePath, fileSize, partSize, signal, onProgress } = options
    const storageClass = s3ClassOf(options.storageClass)
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
      await this.uploadParts(client, access.bucket, storageClass, options)
    })
  }

  // Stops a multipart upload, so S3 deletes its parts and stops billing them.
  abortUpload(access: S3Access, key: string, uploadId: string): Promise<void> {
    return this.withBucket(access, async (client) => {
      await client.send(
        new AbortMultipartUploadCommand({ Bucket: access.bucket, Key: key, UploadId: uploadId })
      )
    })
  }

  // Streams one object into a .part file that becomes the target only once complete. A .part file left by an earlier
  // run is continued with a range request, which S3 answers only while the object is still the version it came from.
  downloadFile(access: S3Access, options: DownloadFileOptions): Promise<void> {
    const { key, targetPath, etag, bytesTotal, signal, onStart, onProgress } = options
    return this.withBucket(access, async (client) => {
      let offset = await resumeOffset(targetPath, etag, bytesTotal)
      if (offset === null) return

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
      await saveDownload(body, { targetPath, offset, total }, signal, onProgress)
    })
  }

  deleteFile(access: S3Access, key: string): Promise<void> {
    return this.withBucket(access, async (client) => {
      await client.send(new DeleteObjectCommand({ Bucket: access.bucket, Key: key }))
    })
  }

  // Asks S3 for a temporary copy of an archived file, kept for the given number of days.
  restoreFile(access: S3Access, key: string, tier: RestoreTier, days: number): Promise<void> {
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

  // The key is the name in the bucket, so S3 needs no other name for the file.
  async fileName(_access: S3Access, key: string): Promise<string> {
    return key
  }

  // Every file under the prefix, at any depth, without the empty folder markers the S3 console makes.
  async folderFiles(access: S3Access, prefix: string): Promise<TreeFile[]> {
    checkFolderPrefix(prefix)
    return this.withBucket(access, async (client) => {
      const files: TreeFile[] = []
      for await (const contents of this.objectPages(client, access.bucket, prefix)) {
        for (const file of filesOf(contents, prefix)) {
          if (!file.key.endsWith('/')) files.push({ ...file, path: file.name })
        }
      }
      return files
    })
  }

  async folderName(_access: S3Access, prefix: string): Promise<string> {
    return prefixName(prefix)
  }

  // Deletes every object under the prefix, folder markers too, a thousand at a time. A versioned bucket keeps the older
  // versions.
  async deleteFolder(access: S3Access, prefix: string): Promise<void> {
    checkFolderPrefix(prefix)
    return this.withBucket(access, async (client) => {
      for await (const contents of this.objectPages(client, access.bucket, prefix)) {
        const keys = contents.flatMap((object) => (object.Key === undefined ? [] : [object.Key]))
        for (let start = 0; start < keys.length; start += S3_DELETE_BATCH) {
          const batch = keys.slice(start, start + S3_DELETE_BATCH).map((Key) => ({ Key }))
          const output = await client.send(
            new DeleteObjectsCommand({
              Bucket: access.bucket,
              Delete: { Objects: batch, Quiet: true }
            })
          )
          const failed = output.Errors?.[0]
          if (failed !== undefined) {
            throw Object.assign(new Error("S3 didn't delete every file."), {
              name: failed.Code ?? 'DeleteFailed'
            })
          }
        }
      }
    })
  }

  // S3 forgets an unfinished upload when a lifecycle rule or an abort removes it; the upload then starts over.
  private async uploadParts(
    client: S3Client,
    bucket: string,
    storageClass: UploadStorageClass,
    options: UploadFileOptions
  ): Promise<void> {
    try {
      await this.sendParts(client, bucket, storageClass, options)
    } catch (error) {
      if (propertyOf(error, 'name') === 'NoSuchUpload') throw new UploadExpiredError()
      throw error
    }
  }

  private async sendParts(
    client: S3Client,
    bucket: string,
    storageClass: UploadStorageClass,
    options: UploadFileOptions
  ): Promise<void> {
    const { key, filePath, fileSize, partSize, signal, onCreated, onPart, onProgress } = options
    const uploadId =
      options.uploadId === null
        ? await this.createUpload(client, bucket, key, storageClass, signal)
        : options.uploadId
    if (options.uploadId === null) onCreated(uploadId)

    const parts = new Map(options.parts.map((part) => [part.partNumber, part]))
    let bytesDone = partsBytes([...parts.keys()], partSize, fileSize)
    onProgress(bytesDone)
    const missing = partNumbers(fileSize, partSize).filter((partNumber) => !parts.has(partNumber))

    await forEachLimited(missing, PARTS_AT_ONCE, async (partNumber) => {
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

  // Every object under the prefix, one listing page at a time.
  private async *objectPages(
    client: S3Client,
    bucket: string,
    prefix: string
  ): AsyncGenerator<_Object[]> {
    let token: string | undefined
    do {
      const output = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: token,
          OptionalObjectAttributes: ['RestoreStatus']
        })
      )
      yield output.Contents ?? []
      token = output.IsTruncated === true ? output.NextContinuationToken : undefined
    } while (token !== undefined)
  }

  private withBucket<T>(access: S3Access, work: (client: S3Client) => Promise<T>): Promise<T> {
    return this.withClient(access.region, access.credentials, work)
  }

  // Each call gets its own client, destroyed afterwards, so no client keeps the keys.
  private async withClient<T>(
    region: string,
    { accessKeyId, secretAccessKey }: S3Credentials,
    work: (client: S3Client) => Promise<T>
  ): Promise<T> {
    const client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      followRegionRedirects: true
    })
    try {
      return await work(client)
    } finally {
      client.destroy()
    }
  }
}
