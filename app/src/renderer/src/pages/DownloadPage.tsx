// The Download page: pick a download template, browse its bucket, then download, restore or delete one file or the selected ones. See docs/UI.md.
import { useCallback, useEffect, useState } from 'react'
import type { FolderListing, RestoreTier, S3File } from '../../../shared/types/s3-types'
import type { Template } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { NO_SELECTION } from '../constants/download-constants'
import { downloadService } from '../services/download-service'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageHeading } from '../theme/components/PageHeading'
import { StatusMessage } from '../theme/components/StatusMessage'
import { ConfirmDialog } from '../theme/compositions/ConfirmDialog'
import { FolderBreadcrumb } from '../theme/compositions/FolderBreadcrumb'
import { FolderTable } from '../theme/compositions/FolderTable'
import { RestoreDialog } from '../theme/compositions/RestoreDialog'
import { SelectionBar } from '../theme/compositions/SelectionBar'
import { TemplatePicker } from '../theme/compositions/TemplatePicker'
import { TransferList } from '../theme/compositions/TransferList'
import type { FileDialog, FolderPlace, ShownFolder } from '../types/download-types'
import {
  appendListing,
  deletedMessage,
  downloadsStartedMessage,
  downloadStartedMessage,
  fileCount,
  namesWithMore,
  restoringMessage,
  samePlace,
  selectedFiles
} from '../utils/download-utils'
import { messageOf } from '../utils/error-utils'
import { selectedTemplate, sortByName } from '../utils/template-utils'
import { transfersOfKind } from '../utils/transfer-utils'

// Shown only while at least one download template exists.
export function DownloadPage({
  templates,
  transfers
}: {
  templates: Template[]
  transfers: Transfer[]
}): React.JSX.Element {
  const [place, setPlace] = useState<FolderPlace>(() => ({
    templateId: sortByName(templates)[0].id,
    prefix: ''
  }))
  const [shown, setShown] = useState<ShownFolder | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(NO_SELECTION)
  const [dialog, setDialog] = useState<FileDialog>({ kind: 'none' })
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const template = selectedTemplate(templates, place.templateId)
  const current = shown !== null && samePlace(shown.place, place) ? shown : null
  const files = current !== null && current.state === 'loaded' ? current.listing.files : []

  useEffect(() => {
    let active = true
    downloadService
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

  const goTo = (next: FolderPlace): void => {
    setMessage(undefined)
    setError(undefined)
    setSelected(NO_SELECTION)
    setPlace(next)
  }
  const openFolder = (prefix: string): void => goTo({ templateId: place.templateId, prefix })

  const changeFiles = (change: (files: S3File[]) => S3File[]): void =>
    setShown((previous) =>
      previous !== null && previous.state === 'loaded'
        ? { ...previous, listing: { ...previous.listing, files: change(previous.listing.files) } }
        : previous
    )

  const select = (key: string, on: boolean): void =>
    setSelected((previous) => {
      const next = new Set(previous)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  const closeDialog = useCallback((): void => {
    setDialog({ kind: 'none' })
    setDialogError(undefined)
  }, [])

  // Acts on each file in turn. If one fails, the files done so far are shown as done, and the dialog stays open with the rest.
  const runOnEach = async (
    targets: S3File[],
    act: (file: S3File) => Promise<void>,
    showDone: (keys: ReadonlySet<string>) => void,
    reopen: (rest: S3File[]) => void,
    done: string
  ): Promise<void> => {
    setDialogBusy(true)
    setDialogError(undefined)
    const finished = new Set<string>()
    try {
      for (const file of targets) {
        await act(file)
        finished.add(file.key)
      }
      closeDialog()
      setMessage(done)
    } catch (reason) {
      reopen(targets.filter((file) => !finished.has(file.key)))
      setDialogError(messageOf(reason))
    } finally {
      showDone(finished)
      setDialogBusy(false)
    }
  }

  const deleteFiles = (targets: S3File[]): Promise<void> =>
    runOnEach(
      targets,
      (file) => downloadService.delete({ templateId: template.id, key: file.key }),
      (keys) => {
        changeFiles((listed) => listed.filter((file) => !keys.has(file.key)))
        setSelected((previous) => new Set([...previous].filter((key) => !keys.has(key))))
      },
      (rest) => setDialog({ kind: 'delete', files: rest }),
      deletedMessage(targets)
    )

  const restoreFiles = (targets: S3File[], tier: RestoreTier, days: number): Promise<void> =>
    runOnEach(
      targets,
      (file) => downloadService.restore({ templateId: template.id, key: file.key, tier, days }),
      (keys) =>
        changeFiles((listed) =>
          listed.map((file) =>
            keys.has(file.key) ? { ...file, access: { state: 'restoring' } } : file
          )
        ),
      (rest) => setDialog({ kind: 'restore', files: rest }),
      restoringMessage(targets)
    )

  const loadMore = async (listing: FolderListing, continuationToken: string): Promise<void> => {
    setLoadingMore(true)
    try {
      const next = await downloadService.listFolder({
        templateId: place.templateId,
        prefix: place.prefix,
        continuationToken
      })
      setShown({ place, state: 'loaded', listing: appendListing(listing, next) })
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setLoadingMore(false)
    }
  }

  // Queues each file in turn, and stops at the first one main refuses.
  const download = async (targets: S3File[]): Promise<void> => {
    setMessage(undefined)
    setError(undefined)
    try {
      const savedAs: string[] = []
      for (const file of targets) {
        savedAs.push(await downloadService.download({ templateId: template.id, key: file.key }))
      }
      setMessage(
        targets.length === 1
          ? downloadStartedMessage(targets[0].name, savedAs[0])
          : downloadsStartedMessage(targets.length)
      )
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  return (
    <>
      <PageHeading title="Download">
        Open folders to find a file. Download saves it in your download folder; archived files need
        a restore first. Select several files to act on them together.
      </PageHeading>
      <TemplatePicker
        templates={templates}
        selectedId={template.id}
        onSelect={(templateId) => goTo({ templateId, prefix: '' })}
      />
      <FolderBreadcrumb bucket={template.bucket} prefix={place.prefix} onOpenFolder={openFolder} />

      {current === null && <p className="text-muted">Loading…</p>}
      {current !== null && current.state === 'failed' && <ErrorMessage message={current.error} />}
      {current !== null && current.state === 'loaded' && (
        <>
          <SelectionBar
            files={selectedFiles(files, selected)}
            onDownload={(targets) => void download(targets)}
            onRestore={(targets) => setDialog({ kind: 'restore', files: targets })}
            onDelete={(targets) => setDialog({ kind: 'delete', files: targets })}
            onClear={() => setSelected(NO_SELECTION)}
          />
          <FolderTable
            listing={current.listing}
            prefix={place.prefix}
            loadingMore={loadingMore}
            selected={selected}
            onSelect={select}
            onSelectAll={(on) =>
              setSelected(on ? new Set(files.map((file) => file.key)) : NO_SELECTION)
            }
            onOpenFolder={openFolder}
            onDownload={(file) => void download([file])}
            onRestore={(file) => setDialog({ kind: 'restore', files: [file] })}
            onDelete={(file) => setDialog({ kind: 'delete', files: [file] })}
            onLoadMore={(token) => void loadMore(current.listing, token)}
          />
        </>
      )}

      <StatusMessage message={message} className="mt-4" />
      <ErrorMessage message={error} />
      <TransferList transfers={transfersOfKind(transfers, 'download')} />

      {dialog.kind === 'delete' && (
        <ConfirmDialog
          title={
            dialog.files.length === 1
              ? 'Delete this file?'
              : `Delete ${fileCount(dialog.files.length)}?`
          }
          message={
            <p>
              <strong>{namesWithMore(dialog.files)}</strong>{' '}
              {dialog.files.length === 1 ? 'is' : 'are'} deleted from {template.bucket}. The app
              can&apos;t bring {dialog.files.length === 1 ? 'it' : 'them'} back.
            </p>
          }
          confirmLabel="Delete"
          busy={dialogBusy}
          error={dialogError}
          onConfirm={() => void deleteFiles(dialog.files)}
          onCancel={closeDialog}
        />
      )}
      {dialog.kind === 'restore' && (
        <RestoreDialog
          files={dialog.files}
          busy={dialogBusy}
          error={dialogError}
          onRestore={(tier, days) => void restoreFiles(dialog.files, tier, days)}
          onCancel={closeDialog}
        />
      )}
    </>
  )
}
