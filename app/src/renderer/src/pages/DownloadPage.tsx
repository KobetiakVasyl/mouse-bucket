// The Browse page: pick a download template, browse its bucket, container or Drive folder, then download, restore or
// delete one file or the selected ones. The open folder's location can be copied, or start a new upload template. See
// docs/UI.md.
import { useCallback, useEffect, useState } from 'react'
import type {
  FolderEntry,
  FolderListing,
  RestoreOptions,
  RestoreTier,
  StoredFile
} from '../../../shared/types/storage-types'
import { DRIVE_ROOT_ID } from '../../../shared/constants/location-constants'
import type { Template } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { DEFAULT_FILE_SORT, NO_SELECTION } from '../constants/download-constants'
import { STORAGE_HEADINGS } from '../constants/platform-constants'
import { appService } from '../services/app-service'
import { downloadService } from '../services/download-service'
import { Button } from '../theme/components/Button'
import { CopyButton } from '../theme/components/CopyButton'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageLayout } from '../theme/components/PageLayout'
import { Section } from '../theme/components/Section'
import { StatusMessage } from '../theme/components/StatusMessage'
import { ConfirmDialog } from '../theme/compositions/ConfirmDialog'
import { FolderBreadcrumb } from '../theme/compositions/FolderBreadcrumb'
import { FolderTable } from '../theme/compositions/FolderTable'
import { RehydrateDialog } from '../theme/compositions/RehydrateDialog'
import { RestoreDialog } from '../theme/compositions/RestoreDialog'
import { SelectionBar } from '../theme/compositions/SelectionBar'
import { TemplatePicker } from '../theme/compositions/TemplatePicker'
import { TransferList } from '../theme/compositions/TransferList'
import type { FileDialog, FileSort, FolderPlace, ShownFolder } from '../types/download-types'
import {
  appendListing,
  deletedMessage,
  deleteWarning,
  downloadsStartedMessage,
  downloadStartedMessage,
  fileCount,
  folderOf,
  namesWithMore,
  nextSort,
  restoringMessage,
  samePlace,
  selectedFiles
} from '../utils/download-utils'
import { messageOf } from '../utils/error-utils'
import { folderLocation, rootLabel } from '../utils/location-utils'
import { uploadDraft } from '../utils/template-form-utils'
import type { TemplateFormValues } from '../types/template-form-types'
import { selectedTemplate, sortByName } from '../utils/template-utils'
import { transfersOfKind } from '../utils/transfer-utils'
import { AddIcon, DeleteIcon } from '../theme/components/icons'

// Shown only while at least one download template exists.
export function DownloadPage({
  templates,
  transfers,
  restoreDefaults,
  onNewUploadTemplate
}: {
  templates: Template[]
  transfers: Transfer[]
  restoreDefaults: { tier: RestoreTier; days: number }
  onNewUploadTemplate: (draft: TemplateFormValues) => void
}): React.JSX.Element {
  const [place, setPlace] = useState<FolderPlace>(() => ({
    templateId: sortByName(templates)[0].id,
    path: []
  }))
  const [shown, setShown] = useState<ShownFolder | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(NO_SELECTION)
  // The sort stays while other folders and templates open.
  const [sort, setSort] = useState<FileSort>(DEFAULT_FILE_SORT)
  const [dialog, setDialog] = useState<FileDialog>({ kind: 'none' })
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const template = selectedTemplate(templates, place.templateId)
  const current = shown !== null && samePlace(shown.place, place) ? shown : null
  const files = current !== null && current.state === 'loaded' ? current.listing.files : []
  const folder = folderOf(place)
  const folderName =
    place.path.length === 0 ? rootLabel(template) : place.path[place.path.length - 1].name
  // My Drive has no link to copy.
  const copyable = !(
    template.platform === 'google-drive' &&
    (folder === '' ? template.folderId : folder) === DRIVE_ROOT_ID
  )

  useEffect(() => {
    let active = true
    downloadService
      .listFolder({
        templateId: place.templateId,
        folder: folderOf(place),
        continuationToken: null
      })
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
  const openPath = (path: FolderEntry[]): void => goTo({ templateId: place.templateId, path })
  const openFolder = (folder: FolderEntry): void => openPath([...place.path, folder])

  const changeFiles = (change: (files: StoredFile[]) => StoredFile[]): void =>
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
    targets: StoredFile[],
    act: (file: StoredFile) => Promise<void>,
    showDone: (keys: ReadonlySet<string>) => void,
    reopen: (rest: StoredFile[]) => void,
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

  const deleteFiles = (targets: StoredFile[]): Promise<void> =>
    runOnEach(
      targets,
      (file) => downloadService.delete({ templateId: template.id, key: file.key }),
      (keys) => {
        changeFiles((listed) => listed.filter((file) => !keys.has(file.key)))
        setSelected((previous) => new Set([...previous].filter((key) => !keys.has(key))))
      },
      (rest) => setDialog({ kind: 'delete', files: rest }),
      deletedMessage(targets, template.platform)
    )

  const restoreFiles = (targets: StoredFile[], options: RestoreOptions): Promise<void> =>
    runOnEach(
      targets,
      (file) => downloadService.restore({ templateId: template.id, key: file.key, options }),
      (keys) =>
        changeFiles((listed) =>
          listed.map((file) =>
            keys.has(file.key) ? { ...file, access: { state: 'restoring' } } : file
          )
        ),
      (rest) => setDialog({ kind: 'restore', files: rest }),
      restoringMessage(targets, template.platform)
    )

  const loadMore = async (listing: FolderListing, continuationToken: string): Promise<void> => {
    setLoadingMore(true)
    try {
      const next = await downloadService.listFolder({
        templateId: place.templateId,
        folder: folderOf(place),
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
  const download = async (targets: StoredFile[]): Promise<void> => {
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
    <PageLayout
      title="Browse"
      description="Open folders to find a file. Download saves it in your download folder; archived files need a restore first. Select several files to act on them together."
    >
      <TemplatePicker
        templates={templates}
        selectedId={template.id}
        onSelect={(templateId) => goTo({ templateId, path: [] })}
      />
      <Section
        title="Files"
        description={
          <FolderBreadcrumb root={rootLabel(template)} path={place.path} onOpenPath={openPath} />
        }
        actions={
          <>
            {copyable && (
              <CopyButton
                text={folderLocation(template, folder)}
                label={template.platform === 'google-drive' ? 'Copy link' : 'Copy URL'}
                className="text-sm"
                onCopy={(text) => appService.copy(text)}
              />
            )}
            <Button
              className="text-sm"
              onClick={() => onNewUploadTemplate(uploadDraft(template, folder, folderName))}
            >
              <AddIcon />
              New upload template here
            </Button>
          </>
        }
        className="mt-10"
      >
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
              storageHeading={STORAGE_HEADINGS[template.platform]}
              sort={sort}
              onSort={(by) => setSort((current) => nextSort(current, by))}
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
      </Section>

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
              {deleteWarning(template.platform, rootLabel(template), dialog.files.length)}
            </p>
          }
          confirmLabel="Delete"
          confirmIcon={<DeleteIcon />}
          busy={dialogBusy}
          error={dialogError}
          onConfirm={() => void deleteFiles(dialog.files)}
          onCancel={closeDialog}
        />
      )}
      {dialog.kind === 'restore' && template.platform === 'azure' && (
        <RehydrateDialog
          files={dialog.files}
          busy={dialogBusy}
          error={dialogError}
          onRestore={(tier, priority) =>
            void restoreFiles(dialog.files, { platform: 'azure', tier, priority })
          }
          onCancel={closeDialog}
        />
      )}
      {dialog.kind === 'restore' && template.platform === 's3' && (
        <RestoreDialog
          files={dialog.files}
          defaultTier={restoreDefaults.tier}
          defaultDays={restoreDefaults.days}
          busy={dialogBusy}
          error={dialogError}
          onRestore={(tier, days) =>
            void restoreFiles(dialog.files, { platform: 's3', tier, days })
          }
          onCancel={closeDialog}
        />
      )}
    </PageLayout>
  )
}
