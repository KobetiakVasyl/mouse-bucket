// The Download page: pick a download template, browse its bucket, then download, restore or delete files. See docs/UI.md.
import { useCallback, useEffect, useState } from 'react'
import type { FolderListing, RestoreTier, S3File } from '../../../shared/types/s3-types'
import type { Template } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { downloadService } from '../services/download-service'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageHeading } from '../theme/components/PageHeading'
import { StatusMessage } from '../theme/components/StatusMessage'
import { ConfirmDialog } from '../theme/compositions/ConfirmDialog'
import { FolderBreadcrumb } from '../theme/compositions/FolderBreadcrumb'
import { FolderTable } from '../theme/compositions/FolderTable'
import { RestoreDialog } from '../theme/compositions/RestoreDialog'
import { TemplatePicker } from '../theme/compositions/TemplatePicker'
import { TransferList } from '../theme/compositions/TransferList'
import type { FileDialog, FolderPlace, ShownFolder } from '../types/download-types'
import { appendListing, samePlace } from '../utils/download-utils'
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
  const [dialog, setDialog] = useState<FileDialog>({ kind: 'none' })
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const template = selectedTemplate(templates, place.templateId)
  const current = shown !== null && samePlace(shown.place, place) ? shown : null

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
      await downloadService.delete({ templateId: template.id, key: file.key })
      changeFiles((files) => files.filter((candidate) => candidate.key !== file.key))
      setMessage(`Deleted ${file.name}.`)
    })

  const restoreFile = (file: S3File, tier: RestoreTier, days: number): Promise<void> =>
    runDialogAction(async () => {
      await downloadService.restore({ templateId: template.id, key: file.key, tier, days })
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

  const download = async (file: S3File): Promise<void> => {
    setMessage(undefined)
    setError(undefined)
    try {
      if (await downloadService.download({ templateId: template.id, key: file.key })) {
        setMessage(`Downloading ${file.name}. It's in the transfers below.`)
      }
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

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
      <FolderBreadcrumb bucket={template.bucket} prefix={place.prefix} onOpenFolder={openFolder} />

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

      <StatusMessage message={message} className="mt-4" />
      <ErrorMessage message={error} />
      <TransferList transfers={transfersOfKind(transfers, 'download')} />

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
