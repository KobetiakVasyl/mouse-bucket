// Talks to Google Drive with the user's own OAuth client: describes a folder, lists one, uploads files through resumable
// sessions and downloads them from where they stopped, and moves files to the trash. See docs/ARCHITECTURE.md.
import type { Hash } from 'node:crypto'
import {
  DRIVE_ID_PATTERN,
  DRIVE_ROOT_ID,
  DRIVE_ROOT_NAME
} from '../../shared/constants/location-constants'
import type { FolderListing } from '../../shared/types/storage-types'
import {
  FOLDER_MIME_TYPE,
  GOOGLE_FILE_REASON,
  LIST_FIELDS,
  LISTING_PAGE_SIZE,
  RESUME_INCOMPLETE,
  SESSION_GONE_STATUSES,
  UPLOAD_SESSION_ORIGIN,
  UPLOAD_SESSION_URL
} from '../constants/drive-constants'
import type { DriveAccess, DriveCredentials } from '../types/credential-types'
import type { ConnectDrive, DriveConnection, FetchLike, SessionState } from '../types/drive-types'
import type {
  DownloadFileOptions,
  PlatformStorage,
  TreeFile,
  UploadFileOptions
} from '../types/storage-service-types'
import { resumeOffset, saveDownload } from '../utils/download-utils'
import {
  driveErrorOf,
  driveFilesOf,
  driveFoldersOf,
  driveSafeName,
  isGoogleFile,
  quoted,
  receivedBytes,
  sessionError
} from '../utils/drive-utils'
import { UploadExpiredError, UserError } from '../utils/error-utils'
import { md5Through, readRange, serialize } from '../utils/file-utils'

export class GoogleDriveService implements PlatformStorage<DriveAccess> {
  // The folders and files listed under each template's folder. The page may only name those, so it can't reach the rest
  // of the Drive through a template.
  private readonly listed = new Map<string, Set<string>>()
  // Folders are made one at a time, so two uploads into a new folder don't each make one.
  private readonly folderSerial = serialize()

  constructor(
    private readonly connect: ConnectDrive,
    private readonly fetch: FetchLike
  ) {}

  // The folder a template points at, with its name: My Drive for the root.
  describeFolder(
    credentials: DriveCredentials,
    folderId: string
  ): Promise<{ folderId: string; folderName: string }> {
    return this.call(async () => {
      const { data } = await this.connect(credentials).files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, trashed',
        supportsAllDrives: true
      })
      if (data.mimeType !== FOLDER_MIME_TYPE) throw new UserError("That link isn't a folder.")
      if (data.trashed === true) throw new UserError('That folder is in the trash.')
      if (folderId === DRIVE_ROOT_ID) return { folderId, folderName: DRIVE_ROOT_NAME }
      return { folderId: data.id ?? folderId, folderName: data.name ?? folderId }
    })
  }

  async listFolder(
    access: DriveAccess,
    folder: string,
    continuationToken: string | null
  ): Promise<FolderListing> {
    if (folder !== '') this.checkListed(access, folder)
    const parent = folder === '' ? access.folderId : folder
    return this.call(async () => {
      const { data } = await this.connect(access.credentials).files.list({
        q: `${quoted(parent)} in parents and trashed = false`,
        fields: LIST_FIELDS,
        pageSize: LISTING_PAGE_SIZE,
        pageToken: continuationToken === null ? undefined : continuationToken,
        orderBy: 'folder,name_natural',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      })
      const files = data.files ?? []
      const listing: FolderListing = {
        folders: driveFoldersOf(files),
        files: driveFilesOf(files),
        nextToken: data.nextPageToken ?? null
      }
      const known = this.listedUnder(access)
      for (const entry of [
        ...listing.folders.map((f) => f.id),
        ...listing.files.map((f) => f.key)
      ]) {
        known.add(entry)
      }
      return listing
    })
  }

  // Sends the file in order through a resumable session, which Drive keeps for a week, from where Drive says it got to.
  // The key is the file's path inside the folder; missing folders on the way are made. Drive's MD5 of the finished file
  // must match this computer's, or the file is deleted again.
  uploadFile(access: DriveAccess, options: UploadFileOptions): Promise<void> {
    const { key, filePath, fileSize, partSize, signal, onCreated, onPart, onProgress } = options
    return this.call(async () => {
      signal.throwIfAborted()
      if (options.storageClass !== null) throw new UserError('Google Drive has no storage classes.')
      const connection = this.connect(access.credentials)
      let sessionUrl = options.uploadId
      // A saved session URL that isn't Google's is never sent anything; the upload starts over instead.
      if (sessionUrl !== null && !this.isSessionUrl(sessionUrl)) throw new UploadExpiredError()
      if (sessionUrl === null) {
        sessionUrl = await this.startSession(connection, access, key, fileSize, signal)
        onCreated(sessionUrl)
      }
      const reported = new Set(options.parts.map((part) => part.partNumber))
      const report = (received: number): void => {
        for (let partNumber = 1; partNumber * partSize <= received; partNumber++) {
          if (reported.has(partNumber)) continue
          reported.add(partNumber)
          onPart({ partNumber, etag: '', checksum: '' })
        }
        onProgress(received)
      }

      let state = await this.sessionState(sessionUrl, fileSize, signal)
      let hash: Hash | null = null
      let offset = 0
      while (!state.done) {
        if (hash === null || offset !== state.received) {
          offset = state.received
          hash = await md5Through(filePath, offset)
        }
        report(offset)
        const length = Math.min(partSize, fileSize - offset)
        const body = await readRange(filePath, offset, length)
        hash.update(body)
        offset += length
        state = await this.sendChunk(sessionUrl, body, offset - length, fileSize, signal)
      }
      const localMd5 =
        hash !== null && offset === fileSize ? hash : await md5Through(filePath, fileSize)
      await this.checkUploaded(connection, state, localMd5.digest('hex'))
      onProgress(fileSize)
    })
  }

  // Asks Drive to forget the session. It forgets it after a week anyway, so a failure here doesn't matter.
  async abortUpload(_access: DriveAccess, _key: string, uploadId: string): Promise<void> {
    if (!this.isSessionUrl(uploadId)) return
    await this.fetch(uploadId, { method: 'DELETE' }).catch(() => undefined)
  }

  // Streams the file into a .part file that becomes the target only once complete. A .part file is continued only while
  // the file is still the version it came from, by its MD5, or its modification time when Drive has no MD5.
  downloadFile(access: DriveAccess, options: DownloadFileOptions): Promise<void> {
    const { key, targetPath, etag, bytesTotal, signal, onStart, onProgress } = options
    return this.call(async () => {
      const { files } = this.connect(access.credentials)
      const { data: meta } = await files.get(
        {
          fileId: key,
          fields: 'size, md5Checksum, modifiedTime, mimeType',
          supportsAllDrives: true
        },
        { signal }
      )
      if (isGoogleFile(meta.mimeType)) throw new UserError(GOOGLE_FILE_REASON)
      const version = meta.md5Checksum ?? meta.modifiedTime ?? ''
      const total = Number(meta.size ?? 0)
      let offset = await resumeOffset(targetPath, etag === version ? etag : null, bytesTotal)
      if (offset === null) return
      onStart(version, total)
      const response = await files.get(
        { fileId: key, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream', signal, headers: offset > 0 ? { Range: `bytes=${offset}-` } : {} }
      )
      // Drive sends the whole file when it ignores the range; then the download starts over.
      if (offset > 0 && response.status !== 206) offset = 0
      await saveDownload(response.data, { targetPath, offset, total }, signal, onProgress)
    })
  }

  // Moves the file to the Drive's trash, from where it can be restored for 30 days.
  async deleteFile(access: DriveAccess, key: string): Promise<void> {
    this.checkListed(access, key)
    return this.call(async () => {
      await this.connect(access.credentials).files.update({
        fileId: key,
        requestBody: { trashed: true },
        supportsAllDrives: true
      })
    })
  }

  // Drive allows a slash in a name, which a file on this computer can't have.
  async fileName(access: DriveAccess, key: string): Promise<string> {
    this.checkListed(access, key)
    return this.call(async () => {
      const { data } = await this.connect(access.credentials).files.get({
        fileId: key,
        fields: 'name, mimeType',
        supportsAllDrives: true
      })
      if (isGoogleFile(data.mimeType)) throw new UserError(GOOGLE_FILE_REASON)
      return driveSafeName(data.name ?? key)
    })
  }

  // Every file inside a listed folder, at any depth, walking it one folder at a time. What it finds counts as listed.
  async folderFiles(access: DriveAccess, folder: string): Promise<TreeFile[]> {
    this.checkListed(access, folder)
    return this.call(async () => {
      const { files } = this.connect(access.credentials)
      const known = this.listedUnder(access)
      const found: TreeFile[] = []
      const waiting = [{ id: folder, path: '' }]
      for (let next = waiting.shift(); next !== undefined; next = waiting.shift()) {
        let pageToken: string | undefined
        do {
          const { data } = await files.list({
            q: `${quoted(next.id)} in parents and trashed = false`,
            fields: LIST_FIELDS,
            pageSize: LISTING_PAGE_SIZE,
            pageToken,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          })
          const listed = data.files ?? []
          for (const sub of driveFoldersOf(listed)) {
            known.add(sub.id)
            waiting.push({ id: sub.id, path: `${next.path}${driveSafeName(sub.name)}/` })
          }
          for (const file of driveFilesOf(listed)) {
            known.add(file.key)
            found.push({ ...file, path: `${next.path}${driveSafeName(file.name)}` })
          }
          pageToken = data.nextPageToken ?? undefined
        } while (pageToken !== undefined)
      }
      return found
    })
  }

  async folderName(access: DriveAccess, folder: string): Promise<string> {
    this.checkListed(access, folder)
    return this.call(async () => {
      const { data } = await this.connect(access.credentials).files.get({
        fileId: folder,
        fields: 'name',
        supportsAllDrives: true
      })
      return driveSafeName(data.name ?? folder)
    })
  }

  // Moves the folder, with everything in it, to the Drive's trash, from where it can be restored for 30 days.
  async deleteFolder(access: DriveAccess, folder: string): Promise<void> {
    return this.deleteFile(access, folder)
  }

  // The session takes the file's name, inside the folder at the key's path.
  private async startSession(
    connection: DriveConnection,
    access: DriveAccess,
    key: string,
    fileSize: number,
    signal: AbortSignal
  ): Promise<string> {
    const folders = key.split('/')
    const name = folders.pop() ?? key
    const parent = await this.folderAt(connection, access.folderId, folders)
    const { token } = await connection.auth.getAccessToken()
    if (token === null || token === undefined)
      throw new UserError("Google didn't sign the request.")
    const response = await this.fetch(UPLOAD_SESSION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/octet-stream',
        'X-Upload-Content-Length': String(fileSize)
      },
      body: JSON.stringify({ name, parents: [parent] }),
      signal
    })
    if (!response.ok) throw await sessionError(response)
    const location = response.headers.get('location')
    if (location === null || !this.isSessionUrl(location)) {
      throw new Error("Google Drive didn't start the upload.")
    }
    return location
  }

  // A session URL carries the right to upload by itself, so the request needs no sign-in.
  private async sessionState(
    sessionUrl: string,
    fileSize: number,
    signal: AbortSignal
  ): Promise<SessionState> {
    const response = await this.fetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes */${fileSize}` },
      signal,
      redirect: 'manual'
    })
    return this.stateOf(response)
  }

  private async sendChunk(
    sessionUrl: string,
    body: Buffer,
    start: number,
    fileSize: number,
    signal: AbortSignal
  ): Promise<SessionState> {
    const end = start + body.length - 1
    const response = await this.fetch(sessionUrl, {
      method: 'PUT',
      headers: { 'Content-Range': `bytes ${start}-${end}/${fileSize}` },
      body: new Uint8Array(body),
      signal,
      redirect: 'manual'
    })
    return this.stateOf(response)
  }

  private async stateOf(response: Response): Promise<SessionState> {
    if (response.status === RESUME_INCOMPLETE) {
      return { done: false, received: receivedBytes(response.headers.get('range')) }
    }
    if (SESSION_GONE_STATUSES.has(response.status)) throw new UploadExpiredError()
    if (!response.ok) throw await sessionError(response)
    const file: unknown = await response.json()
    const id: unknown = typeof file === 'object' && file !== null ? Reflect.get(file, 'id') : null
    const md5: unknown =
      typeof file === 'object' && file !== null ? Reflect.get(file, 'md5Checksum') : null
    if (typeof id !== 'string') throw new Error("Google Drive didn't name the uploaded file.")
    return { done: true, id, md5Checksum: typeof md5 === 'string' ? md5 : '' }
  }

  private async checkUploaded(
    connection: DriveConnection,
    state: SessionState,
    localMd5: string
  ): Promise<void> {
    if (!state.done || state.md5Checksum === localMd5) return
    await connection.files
      .delete({ fileId: state.id, supportsAllDrives: true })
      .catch(() => undefined)
    throw new UserError(
      "The uploaded file didn't match the one on this computer, so it was deleted. Retry the upload."
    )
  }

  // The folder at the path under the template's folder, made where missing.
  private folderAt(connection: DriveConnection, rootId: string, names: string[]): Promise<string> {
    return this.folderSerial(async () => {
      let parent = rootId
      for (const name of names.filter((part) => part !== '')) {
        const { data } = await connection.files.list({
          q: `name = ${quoted(name)} and ${quoted(parent)} in parents and mimeType = ${quoted(FOLDER_MIME_TYPE)} and trashed = false`,
          fields: 'files(id)',
          pageSize: 1,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        })
        const found = data.files?.[0]?.id
        if (typeof found === 'string') {
          parent = found
          continue
        }
        const created = await connection.files.create({
          requestBody: { name, mimeType: FOLDER_MIME_TYPE, parents: [parent] },
          fields: 'id',
          supportsAllDrives: true
        })
        if (typeof created.data.id !== 'string')
          throw new Error("Google Drive didn't make the folder.")
        parent = created.data.id
      }
      return parent
    })
  }

  private listedUnder(access: DriveAccess): Set<string> {
    let known = this.listed.get(access.folderId)
    if (known === undefined) {
      known = new Set()
      this.listed.set(access.folderId, known)
    }
    return known
  }

  private checkListed(access: DriveAccess, id: string): void {
    if (!DRIVE_ID_PATTERN.test(id) || !this.listedUnder(access).has(id)) {
      throw new UserError('Open the folder again, then try once more.')
    }
  }

  private isSessionUrl(url: string): boolean {
    return URL.canParse(url) && new URL(url).origin === UPLOAD_SESSION_ORIGIN
  }

  private async call<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work()
    } catch (error) {
      throw driveErrorOf(error)
    }
  }
}
