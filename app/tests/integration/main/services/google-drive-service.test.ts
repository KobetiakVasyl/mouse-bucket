import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleDriveService } from '../../../../src/main/services/google-drive-service'
import type { DriveAccess } from '../../../../src/main/types/credential-types'
import type { DriveConnection, FetchLike } from '../../../../src/main/types/drive-types'
import type {
  DownloadFileOptions,
  UploadFileOptions
} from '../../../../src/main/types/storage-service-types'
import type { UploadPart } from '../../../../src/main/types/transfer-queue-types'
import { UploadExpiredError, UserError } from '../../../../src/main/utils/error-utils'
import { makeTempDir, removeTempDir } from '../../../support/temp-dir'

const ROOT = '1RootFolderIdAbCdEf'
const ACCESS: DriveAccess = {
  platform: 'google-drive',
  folderId: ROOT,
  credentials: {
    platform: 'google-drive',
    clientId: 'id',
    clientSecret: 'secret',
    refreshToken: 'refresh'
  }
}
const SESSION = 'https://www.googleapis.com/upload/drive/v3/files?upload_id=session-1'
const CONTENT = 'abcdefghij'
const md5Hex = (text: string): string => createHash('md5').update(text).digest('hex')
const googleError = (status: number): Error =>
  Object.assign(new Error('raw'), { status, response: { status, data: {} } })

let dir: string
let files: Record<'list' | 'get' | 'create' | 'update' | 'delete', ReturnType<typeof vi.fn>>
let fetch: ReturnType<typeof vi.fn<FetchLike>>
let received: number
let chunks: string[]
let finalMd5: string
const service = (): GoogleDriveService =>
  new GoogleDriveService(
    () =>
      ({
        files,
        auth: { getAccessToken: async () => ({ token: 'access-token' }) }
      }) as unknown as DriveConnection,
    fetch
  )

// A resumable session that keeps every chunk it's sent, and answers as Drive does.
function sessionFetch(): ReturnType<typeof vi.fn<FetchLike>> {
  return vi.fn<FetchLike>(async (_url, init) => {
    if (init.method === 'POST') {
      return new Response(null, { status: 200, headers: { location: SESSION } })
    }
    if (init.method === 'DELETE') return new Response(null, { status: 499 })
    const range = new Headers(init.headers).get('content-range') ?? ''
    const chunk = /^bytes (\d+)-(\d+)\/\d+$/.exec(range)
    if (chunk !== null) {
      chunks.push(Buffer.from(init.body as Uint8Array).toString())
      received = Number(chunk[2]) + 1
    }
    if (received >= CONTENT.length) {
      return Response.json({ id: 'new-file', md5Checksum: finalMd5 }, { status: 200 })
    }
    const headers: Record<string, string> = received > 0 ? { range: `bytes=0-${received - 1}` } : {}
    return new Response(null, { status: 308, headers })
  })
}

beforeEach(async () => {
  dir = await makeTempDir()
  received = 0
  chunks = []
  finalMd5 = md5Hex(CONTENT)
  files = {
    list: vi.fn(async () => ({ data: { files: [] } })),
    get: vi.fn(),
    create: vi.fn(async () => ({ data: { id: 'new-folder' } })),
    update: vi.fn(async () => ({ data: {} })),
    delete: vi.fn(async () => ({ data: {} }))
  }
  fetch = sessionFetch()
})
afterEach(async () => {
  await removeTempDir(dir)
})

async function upload(changes: Partial<UploadFileOptions> = {}): Promise<{
  parts: UploadPart[]
  created: string[]
}> {
  const filePath = join(dir, 'notes.txt')
  await writeFile(filePath, CONTENT)
  const parts: UploadPart[] = []
  const created: string[] = []
  await service().uploadFile(ACCESS, {
    key: 'Photos/notes.txt',
    storageClass: null,
    filePath,
    fileSize: CONTENT.length,
    partSize: 4,
    uploadId: null,
    parts: [],
    signal: new AbortController().signal,
    onCreated: (uploadId) => created.push(uploadId),
    onPart: (part) => parts.push(part),
    onProgress: () => undefined,
    ...changes
  })
  return { parts, created }
}

describe('GoogleDriveService uploads', () => {
  it('makes the missing folder, starts a session there, and sends the file in order', async () => {
    const { parts, created } = await upload()
    expect(files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          name: 'Photos',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [ROOT]
        }
      })
    )
    const start = fetch.mock.calls[0][1]
    expect(new Headers(start.headers).get('authorization')).toBe('Bearer access-token')
    expect(JSON.parse(String(start.body))).toEqual({ name: 'notes.txt', parents: ['new-folder'] })
    expect(created).toEqual([SESSION])
    expect(chunks).toEqual(['abcd', 'efgh', 'ij'])
    expect(parts.map((part) => part.partNumber)).toEqual([1, 2])
    expect(files.delete).not.toHaveBeenCalled()
  })

  it('uses a folder that exists, and continues a session from where Drive got to', async () => {
    files.list.mockResolvedValueOnce({ data: { files: [{ id: 'existing' }] } })
    received = 4
    await upload({ uploadId: SESSION, parts: [{ partNumber: 1, etag: '', checksum: '' }] })
    expect(files.create).not.toHaveBeenCalled()
    expect(fetch.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false)
    expect(chunks).toEqual(['efgh', 'ij'])
  })

  it("deletes an upload whose MD5 doesn't match the file's, and starts over when the session is gone", async () => {
    finalMd5 = 'something-else'
    await expect(upload()).rejects.toThrow("didn't match")
    expect(files.delete).toHaveBeenCalledWith({ fileId: 'new-file', supportsAllDrives: true })

    fetch = vi.fn<FetchLike>(async () => new Response(null, { status: 404 }))
    await expect(upload({ uploadId: SESSION })).rejects.toBeInstanceOf(UploadExpiredError)
  })

  it("sends nothing to a saved session URL that isn't Google's, and starts over", async () => {
    await expect(upload({ uploadId: 'https://example.com/upload?id=1' })).rejects.toBeInstanceOf(
      UploadExpiredError
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses a storage class, which Google Drive has none of', async () => {
    await expect(upload({ storageClass: 'STANDARD' })).rejects.toThrow('no storage classes')
  })
})

describe('GoogleDriveService downloads', () => {
  const download = (changes: Partial<DownloadFileOptions> = {}): Promise<void> =>
    service().downloadFile(ACCESS, {
      key: 'file-1',
      targetPath: join(dir, 'notes.txt'),
      etag: null,
      bytesTotal: null,
      signal: new AbortController().signal,
      onStart: () => undefined,
      onProgress: () => undefined,
      ...changes
    })
  const meta = (md5: string): unknown => ({
    data: { size: '10', md5Checksum: md5, mimeType: 'application/zip' }
  })
  const media = (text: string, status = 200): unknown => ({
    status,
    data: Readable.from([Buffer.from(text)])
  })

  it('saves the file through a .part file, named by its MD5 as its version', async () => {
    files.get.mockResolvedValueOnce(meta('m1')).mockResolvedValueOnce(media(CONTENT))
    const onStart = vi.fn()
    await download({ onStart })
    expect(onStart).toHaveBeenCalledWith('m1', 10)
    expect(await readFile(join(dir, 'notes.txt'), 'utf8')).toBe(CONTENT)
    expect(await readdir(dir)).toEqual(['notes.txt'])
  })

  it('continues the same version with a range, and starts over once the file changed', async () => {
    await writeFile(join(dir, 'notes.txt.part'), 'abcd')
    files.get.mockResolvedValueOnce(meta('m1')).mockResolvedValueOnce(media('efghij', 206))
    await download({ etag: 'm1', bytesTotal: 10 })
    expect(files.get.mock.calls[1][1]).toMatchObject({ headers: { Range: 'bytes=4-' } })
    expect(await readFile(join(dir, 'notes.txt'), 'utf8')).toBe(CONTENT)

    await writeFile(join(dir, 'other.txt.part'), 'old!')
    files.get.mockResolvedValueOnce(meta('m2')).mockResolvedValueOnce(media(CONTENT))
    await download({ targetPath: join(dir, 'other.txt'), etag: 'm1', bytesTotal: 10 })
    expect(files.get.mock.calls[3][1]).toMatchObject({ headers: {} })
    expect(await readFile(join(dir, 'other.txt'), 'utf8')).toBe(CONTENT)
  })

  it('refuses Google Docs files, which have no content of their own', async () => {
    files.get.mockResolvedValueOnce({
      data: { mimeType: 'application/vnd.google-apps.document' }
    })
    await expect(download()).rejects.toThrow('Google Docs')
  })
})

describe('GoogleDriveService browsing', () => {
  const listing = {
    data: {
      files: [
        { id: 'folder-123456', name: 'Photos', mimeType: 'application/vnd.google-apps.folder' },
        { id: 'file-1234567', name: 'a/b.zip', mimeType: 'application/zip', size: '3' }
      ],
      nextPageToken: 'next'
    }
  }

  it('lists the template’s folder, then only folders and files it listed', async () => {
    files.list.mockResolvedValue(listing)
    const drive = service()
    expect(await drive.listFolder(ACCESS, '', null)).toMatchObject({
      folders: [{ id: 'folder-123456', name: 'Photos' }],
      files: [{ key: 'file-1234567', name: 'a/b.zip', size: 3 }],
      nextToken: 'next'
    })
    expect(files.list.mock.calls[0][0]).toMatchObject({
      q: `'${ROOT}' in parents and trashed = false`
    })
    await drive.listFolder(ACCESS, 'folder-123456', null)
    expect(files.list.mock.calls[1][0]).toMatchObject({
      q: "'folder-123456' in parents and trashed = false"
    })
    await expect(drive.listFolder(ACCESS, 'elsewhere-1234', null)).rejects.toThrow(
      'Open the folder again'
    )
    await expect(drive.deleteFile(ACCESS, 'unlisted-12345')).rejects.toBeInstanceOf(UserError)
  })

  it('moves a listed file to the trash, and names it without slashes', async () => {
    files.list.mockResolvedValue(listing)
    const drive = service()
    await drive.listFolder(ACCESS, '', null)
    await drive.deleteFile(ACCESS, 'file-1234567')
    expect(files.update).toHaveBeenCalledWith({
      fileId: 'file-1234567',
      requestBody: { trashed: true },
      supportsAllDrives: true
    })
    files.get.mockResolvedValueOnce({ data: { name: 'a/b.zip', mimeType: 'application/zip' } })
    expect(await drive.fileName(ACCESS, 'file-1234567')).toBe('a_b.zip')
  })

  it('names My Drive, refuses a link that isn’t a folder, and explains a lost sign-in', async () => {
    files.get.mockResolvedValueOnce({
      data: { id: '0AbCdEf', name: 'Drive', mimeType: 'application/vnd.google-apps.folder' }
    })
    expect(await service().describeFolder(ACCESS.credentials, 'root')).toEqual({
      folderId: 'root',
      folderName: 'My Drive'
    })
    files.get.mockResolvedValueOnce({ data: { id: 'x', name: 'a.txt', mimeType: 'text/plain' } })
    await expect(service().describeFolder(ACCESS.credentials, 'x')).rejects.toThrow(
      "isn't a folder"
    )
    files.list.mockRejectedValueOnce(googleError(401))
    await expect(service().listFolder(ACCESS, '', null)).rejects.toThrow('sign-in')
  })
})

describe('GoogleDriveService folders', () => {
  const folderMime = 'application/vnd.google-apps.folder'

  it('walks a listed folder at any depth, and moves the folder itself to the trash', async () => {
    files.list.mockImplementation(async (params: { q: string }) => {
      if (params.q.startsWith(`'${ROOT}'`)) {
        return { data: { files: [{ id: 'folder-123456', name: 'Photos', mimeType: folderMime }] } }
      }
      if (params.q.startsWith("'folder-123456'")) {
        return {
          data: {
            files: [
              { id: 'sub-folder-1234', name: 'A/B', mimeType: folderMime },
              { id: 'file-1234567', name: 'beach.jpg', mimeType: 'image/jpeg', size: '3' }
            ]
          }
        }
      }
      return {
        data: {
          files: [{ id: 'file-7654321', name: 'snow.jpg', mimeType: 'image/jpeg', size: '4' }]
        }
      }
    })
    const drive = service()
    await drive.listFolder(ACCESS, '', null)
    const found = await drive.folderFiles(ACCESS, 'folder-123456')
    expect(found.map((file) => [file.key, file.path])).toEqual([
      ['file-1234567', 'beach.jpg'],
      ['file-7654321', 'A_B/snow.jpg']
    ])
    await drive.deleteFolder(ACCESS, 'folder-123456')
    expect(files.update).toHaveBeenCalledWith({
      fileId: 'folder-123456',
      requestBody: { trashed: true },
      supportsAllDrives: true
    })
    await expect(drive.folderFiles(ACCESS, 'unlisted-12345')).rejects.toThrow(
      'Open the folder again'
    )
  })
})
