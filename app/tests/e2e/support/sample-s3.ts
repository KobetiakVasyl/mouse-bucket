// Sample S3 answers for end-to-end tests: main's S3 and transfer handlers are swapped for fixed data, so tests never reach AWS. See docs/ARCHITECTURE.md.
import type { FolderListing, S3File } from '../../../src/shared/types/s3-types'
import type { Transfer } from '../../../src/shared/types/transfer-types'

export interface SampleS3 {
  // Listings by folder prefix, '' for the top of the bucket.
  listings: Record<string, FolderListing>
}

const file = (
  key: string,
  size: number,
  storageClass: string,
  access: S3File['access']
): S3File => ({
  key,
  name: key.slice(key.lastIndexOf('/') + 1),
  size,
  lastModified: '2026-11-01T09:30:00.000Z',
  storageClass,
  access
})

export const SAMPLE: SampleS3 = {
  listings: {
    '': {
      folders: ['photos/'],
      files: [
        file('backup.tar.gz', 3_435_973_837, 'DEEP_ARCHIVE', { state: 'archived' }),
        file('contracts.zip', 545_259_520, 'GLACIER', {
          state: 'restored',
          until: '2026-12-01T00:00:00.000Z'
        }),
        file('invoice.pdf', 250_880, 'STANDARD', { state: 'available' }),
        file('photos-2025.zip', 1_181_116_006, 'DEEP_ARCHIVE', { state: 'restoring' })
      ],
      nextToken: null
    },
    'photos/': {
      folders: [],
      files: [file('photos/beach.jpg', 4_200_000, 'STANDARD', { state: 'available' })],
      nextToken: null
    }
  }
}

// Runs inside the app's main process through Playwright, so it can use only its arguments.
export function installSampleS3(
  { ipcMain, BrowserWindow }: typeof import('electron'),
  sample: SampleS3
): void {
  const listings = structuredClone(sample.listings)
  const transfers: Transfer[] = []
  const publish = (): void => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('transfers:changed', [...transfers])
    }
  }
  const replace = (channel: string, answer: (payload: unknown) => unknown): void => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, (_event, payload: unknown) => ({ ok: true, value: answer(payload) }))
  }
  const field = (payload: unknown, name: string): string => {
    const value: unknown =
      typeof payload === 'object' && payload !== null ? Reflect.get(payload, name) : undefined
    return typeof value === 'string' ? value : ''
  }
  const changeFile = (key: string, change: (file: S3File) => S3File | null): void => {
    for (const listing of Object.values(listings)) {
      listing.files = listing.files.flatMap((candidate) => {
        if (candidate.key !== key) return [candidate]
        const changed = change(candidate)
        return changed === null ? [] : [changed]
      })
    }
  }

  replace('download:list', (payload) => {
    const listing = listings[field(payload, 'prefix')]
    return listing === undefined ? { folders: [], files: [], nextToken: null } : listing
  })
  replace('download:delete', (payload) => {
    changeFile(field(payload, 'key'), () => null)
    return undefined
  })
  replace('download:restore', (payload) => {
    changeFile(field(payload, 'key'), (found) => ({ ...found, access: { state: 'restoring' } }))
    return undefined
  })
  replace('download:file', (payload) => {
    const key = field(payload, 'key')
    transfers.push({
      id: `download-${transfers.length}`,
      kind: 'download',
      templateName: 'Sample',
      name: key.slice(key.lastIndexOf('/') + 1),
      bytesDone: 250_880,
      bytesTotal: 250_880,
      status: 'done'
    })
    publish()
    return key.slice(key.lastIndexOf('/') + 1)
  })
  replace('upload:chooseFiles', () => {
    transfers.push(
      {
        id: `upload-${transfers.length}`,
        kind: 'upload',
        templateName: 'Sample',
        name: 'report.pdf',
        bytesDone: 4_000_000,
        bytesTotal: 9_000_000,
        status: 'running'
      },
      {
        id: `upload-${transfers.length + 1}`,
        kind: 'upload',
        templateName: 'Sample',
        name: 'photo.jpg',
        bytesDone: 0,
        bytesTotal: 2_000_000,
        status: 'queued'
      }
    )
    publish()
    return 2
  })
  replace('upload:chooseFolder', () => {
    for (const name of ['Photos/2026/snow.jpg', 'Photos/beach.jpg']) {
      transfers.push({
        id: `upload-${transfers.length}`,
        kind: 'upload',
        templateName: 'Sample',
        name,
        bytesDone: 0,
        bytesTotal: 1_000_000,
        status: 'queued'
      })
    }
    publish()
    return 2
  })

  // The sample transfers answer the transfer buttons themselves, since main's queue doesn't know them.
  const changeTransfer = (id: unknown, status: 'running' | 'paused' | 'cancelled'): undefined => {
    const index = transfers.findIndex((transfer) => transfer.id === id)
    if (index !== -1) {
      const { kind, templateName, name, bytesDone, bytesTotal } = transfers[index]
      transfers[index] = {
        id: transfers[index].id,
        kind,
        templateName,
        name,
        bytesDone,
        bytesTotal,
        status
      }
    }
    publish()
    return undefined
  }
  replace('transfers:pause', (payload) => changeTransfer(payload, 'paused'))
  replace('transfers:resume', (payload) => changeTransfer(payload, 'running'))
  replace('transfers:cancel', (payload) => changeTransfer(payload, 'cancelled'))
  replace('templates:create', (payload) => {
    const location = field(payload, 'location').replace(/^s3:\/\//, '')
    const slash = location.indexOf('/')
    return {
      id: crypto.randomUUID(),
      name: field(payload, 'name'),
      kind: field(payload, 'kind'),
      bucket: slash === -1 ? location : location.slice(0, slash),
      prefix: slash === -1 ? '' : location.slice(slash + 1),
      region: 'eu-west-1'
    }
  })
}
