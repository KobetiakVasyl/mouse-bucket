// The Download page: pick a download template, browse its bucket, then download, restore or delete files. See docs/UI.md.
import { useCallback, useEffect, useState } from 'react'
import type {
  FileAccess,
  FolderListing,
  RestoreTier,
  S3File,
  Template,
  Transfer
} from '../../../shared/ipc'
import { storageClassLabel } from '../../../shared/storage'
import { api, messageOf } from '../api'
import { TemplatePicker } from '../components/TemplatePicker'
import { TransferList } from '../components/TransferList'
import {
  Button,
  CELL,
  ConfirmDialog,
  ErrorMessage,
  Field,
  inputClass,
  Modal,
  PageHeading,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TableFrame,
  ToggleGroup
} from '../components/ui'
import { formatBytes, formatDate } from '../format'
import { selectedTemplate, sortByName } from '../template-order'

// Where the browser is: which template's bucket, and which folder in it ('' for the top).
interface Place {
  templateId: string
  prefix: string
}

// A listing remembers the place it belongs to, so a stale one is never shown.
type Shown =
  | { place: Place; state: 'loaded'; listing: FolderListing }
  | { place: Place; state: 'failed'; error: string }

type Dialog =
  { kind: 'none' } | { kind: 'delete'; file: S3File } | { kind: 'restore'; file: S3File }

const samePlace = (a: Place, b: Place): boolean =>
  a.templateId === b.templateId && a.prefix === b.prefix

const DOWNLOADABLE: ReadonlySet<FileAccess['state']> = new Set(['available', 'restored'])

const LINK = 'rounded text-left underline hover:no-underline'

// Typical restore times, by storage class and speed.
const RESTORE_TIMES = new Map([
  ['DEEP_ARCHIVE', { Standard: 'within 12 hours', Bulk: 'within 48 hours' }],
  ['GLACIER', { Standard: 'in 3 to 5 hours', Bulk: 'in 5 to 12 hours' }]
])

function accessNote(access: FileAccess): string {
  switch (access.state) {
    case 'available':
      return ''
    case 'archived':
      return 'Archived'
    case 'restoring':
      return 'Restoring…'
    case 'restored':
      return `Restored until ${formatDate(access.until)}`
  }
}

// Shown only while at least one download template exists.
export function DownloadPage({
  templates,
  transfers
}: {
  templates: Template[]
  transfers: Transfer[]
}): React.JSX.Element {
  const [place, setPlace] = useState<Place>(() => ({
    templateId: sortByName(templates)[0].id,
    prefix: ''
  }))
  const [shown, setShown] = useState<Shown | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' })
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const template = selectedTemplate(templates, place.templateId)
  const current = shown !== null && samePlace(shown.place, place) ? shown : null

  useEffect(() => {
    let active = true
    api
      .listFolder({ templateId: place.templateId, prefix: place.prefix, continuationToken: null })
      .then(
        (listing) => {
          if (active) setShown({ place, state: 'loaded', listing })
        },
        (reason: unknown) => {
          if (active) setShown({ place, state: 'failed', error: messageOf(reason) })
        }
      )
    return () => {
      active = false
    }
  }, [place])

  const goTo = (next: Place): void => {
    setMessage(undefined)
    setError(undefined)
    setPlace(next)
  }
  const openFolder = (prefix: string): void => goTo({ templateId: place.templateId, prefix })

  const changeFiles = (change: (files: S3File[]) => S3File[]): void =>
    setShown((previous) =>
      previous !== null && previous.state === 'loaded'
        ? { ...previous, listing: { ...previous.listing, files: change(previous.listing.files) } }
        : previous
    )

  const closeDialog = useCallback((): void => {
    setDialog({ kind: 'none' })
    setDialogError(undefined)
  }, [])

  const runDialogAction = async (action: () => Promise<void>): Promise<void> => {
    setDialogBusy(true)
    setDialogError(undefined)
    try {
      await action()
      closeDialog()
    } catch (reason) {
      setDialogError(messageOf(reason))
    } finally {
      setDialogBusy(false)
    }
  }

  const deleteFile = (file: S3File): Promise<void> =>
    runDialogAction(async () => {
      await api.deleteFile({ templateId: template.id, key: file.key })
      changeFiles((files) => files.filter((candidate) => candidate.key !== file.key))
      setMessage(`Deleted ${file.name}.`)
    })

  const restoreFile = (file: S3File, tier: RestoreTier, days: number): Promise<void> =>
    runDialogAction(async () => {
      await api.restoreFile({ templateId: template.id, key: file.key, tier, days })
      changeFiles((files) =>
        files.map((candidate) =>
          candidate.key === file.key ? { ...candidate, access: { state: 'restoring' } } : candidate
        )
      )
      setMessage(`S3 is restoring ${file.name}. Download it once the list shows it as restored.`)
    })

  const loadMore = async (listing: FolderListing, continuationToken: string): Promise<void> => {
    setLoadingMore(true)
    try {
      const more = await api.listFolder({
        templateId: place.templateId,
        prefix: place.prefix,
        continuationToken
      })
      setShown({
        place,
        state: 'loaded',
        listing: {
          folders: [...listing.folders, ...more.folders],
          files: [...listing.files, ...more.files],
          nextToken: more.nextToken
        }
      })
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setLoadingMore(false)
    }
  }

  const download = async (file: S3File): Promise<void> => {
    setMessage(undefined)
    setError(undefined)
    try {
      if (await api.downloadFile({ templateId: template.id, key: file.key })) {
        setMessage(`Downloading ${file.name}. It's in the transfers below.`)
      }
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  const parts = place.prefix.split('/').filter((part) => part !== '')

  return (
    <>
      <PageHeading title="Download">
        Open folders to find a file. Download saves it where you choose; archived files need a
        restore first.
      </PageHeading>
      <TemplatePicker
        templates={templates}
        selectedId={template.id}
        onSelect={(templateId) => goTo({ templateId, prefix: '' })}
      />

      <nav aria-label="Folder" className="mt-8 mb-4 flex flex-wrap gap-x-2">
        <button type="button" className={LINK} onClick={() => openFolder('')}>
          {template.bucket}
        </button>
        {parts.map((part, index) => {
          const path = `${parts.slice(0, index + 1).join('/')}/`
          return (
            <span key={path} className="flex gap-x-2">
              <span aria-hidden="true" className="text-muted">
                /
              </span>
              <button type="button" className={LINK} onClick={() => openFolder(path)}>
                {part}
              </button>
            </span>
          )
        })}
      </nav>

      {current === null && <p className="text-muted">Loading…</p>}
      {current !== null && current.state === 'failed' && <ErrorMessage message={current.error} />}
      {current !== null && current.state === 'loaded' && (
        <FolderTable
          listing={current.listing}
          prefix={place.prefix}
          loadingMore={loadingMore}
          onOpenFolder={openFolder}
          onDownload={(file) => void download(file)}
          onRestore={(file) => setDialog({ kind: 'restore', file })}
          onDelete={(file) => setDialog({ kind: 'delete', file })}
          onLoadMore={(token) => void loadMore(current.listing, token)}
        />
      )}

      {message !== undefined && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
      <ErrorMessage message={error} />
      <TransferList transfers={transfers.filter((transfer) => transfer.kind === 'download')} />

      {dialog.kind === 'delete' && (
        <ConfirmDialog
          title="Delete this file?"
          message={
            <p>
              <strong>{dialog.file.name}</strong> is deleted from {template.bucket}. The app
              can&apos;t bring it back.
            </p>
          }
          confirmLabel="Delete"
          busy={dialogBusy}
          error={dialogError}
          onConfirm={() => void deleteFile(dialog.file)}
          onCancel={closeDialog}
        />
      )}
      {dialog.kind === 'restore' && (
        <RestoreDialog
          file={dialog.file}
          busy={dialogBusy}
          error={dialogError}
          onRestore={(tier, days) => void restoreFile(dialog.file, tier, days)}
          onCancel={closeDialog}
        />
      )}
    </>
  )
}

function FolderTable({
  listing,
  prefix,
  loadingMore,
  onOpenFolder,
  onDownload,
  onRestore,
  onDelete,
  onLoadMore
}: {
  listing: FolderListing
  prefix: string
  loadingMore: boolean
  onOpenFolder: (prefix: string) => void
  onDownload: (file: S3File) => void
  onRestore: (file: S3File) => void
  onDelete: (file: S3File) => void
  onLoadMore: (continuationToken: string) => void
}): React.JSX.Element {
  if (listing.folders.length === 0 && listing.files.length === 0) {
    return <p className="text-muted">This folder is empty.</p>
  }
  const { nextToken } = listing
  return (
    <>
      <TableFrame>
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={CELL}>Name</th>
            <th className={CELL}>Size</th>
            <th className={CELL}>Storage class</th>
            <th className={CELL}>Modified</th>
            <th className={CELL} />
          </tr>
        </thead>
        <tbody>
          {listing.folders.map((folder) => (
            <tr key={folder} className={TABLE_ROW}>
              <td className={CELL}>
                <button type="button" className={LINK} onClick={() => onOpenFolder(folder)}>
                  {folder.slice(prefix.length)}
                </button>
              </td>
              <td className={`${CELL} text-muted`}>Folder</td>
              <td className={CELL} />
              <td className={CELL} />
              <td className={CELL} />
            </tr>
          ))}
          {listing.files.map((file) => (
            <tr key={file.key} className={TABLE_ROW}>
              <td className={`${CELL} break-all`}>{file.name}</td>
              <td className={`${CELL} whitespace-nowrap`}>{formatBytes(file.size)}</td>
              <td className={CELL}>
                {storageClassLabel(file.storageClass)}
                {file.access.state !== 'available' && (
                  <span className="block text-sm text-muted">{accessNote(file.access)}</span>
                )}
              </td>
              <td className={`${CELL} whitespace-nowrap`}>{formatDate(file.lastModified)}</td>
              <td className={CELL}>
                <div className="flex justify-end gap-2">
                  {DOWNLOADABLE.has(file.access.state) && (
                    <Button className="text-sm" onClick={() => onDownload(file)}>
                      Download
                    </Button>
                  )}
                  {file.access.state === 'archived' && (
                    <Button className="text-sm" onClick={() => onRestore(file)}>
                      Restore
                    </Button>
                  )}
                  <Button className="text-sm" variant="danger" onClick={() => onDelete(file)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
      {nextToken !== null && (
        <Button className="mt-4" disabled={loadingMore} onClick={() => onLoadMore(nextToken)}>
          Load more
        </Button>
      )}
    </>
  )
}

function RestoreDialog({
  file,
  busy,
  error,
  onRestore,
  onCancel
}: {
  file: S3File
  busy: boolean
  error: string | undefined
  onRestore: (tier: RestoreTier, days: number) => void
  onCancel: () => void
}): React.JSX.Element {
  const [tier, setTier] = useState<RestoreTier>('Standard')
  const [days, setDays] = useState('7')
  const dayCount = Number(days)
  const validDays = Number.isInteger(dayCount) && dayCount >= 1 && dayCount <= 365
  const times = RESTORE_TIMES.get(file.storageClass)
  return (
    <Modal title="Restore from the archive" onClose={onCancel}>
      <p className="mb-6">
        S3 makes a temporary copy of <strong>{file.name}</strong> that can be downloaded. AWS
        charges for each restore.
      </p>
      <div className="space-y-5">
        <div>
          <ToggleGroup
            label="Speed"
            options={[
              { value: 'Standard', label: 'Standard' },
              { value: 'Bulk', label: 'Bulk (cheaper)' }
            ]}
            value={tier}
            onChange={setTier}
          />
          {times !== undefined && (
            <p className="mt-1 text-sm text-muted">Usually ready {times[tier]}.</p>
          )}
        </div>
        <Field label="Days to keep the copy" hint="From 1 to 365.">
          <input
            className={inputClass}
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!validDays || busy}
          onClick={() => onRestore(tier, dayCount)}
        >
          Restore
        </Button>
      </div>
      <ErrorMessage message={error} />
    </Modal>
  )
}
