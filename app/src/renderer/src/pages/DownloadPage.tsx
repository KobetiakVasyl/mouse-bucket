// The Browse page: pick a download template, browse its bucket, container or Drive folder, then download, restore or
// delete one file or the selected ones. The open folder's location can be copied, or start a new upload template. See
// docs/UI.md.
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react'
import type {
  FolderDownload,
  FolderEntry,
  FolderListing,
  RestoreOptions,
  RestoreTier,
  StoredFile
} from '../../../shared/types/storage-types'
import { DRIVE_ROOT_ID } from '../../../shared/constants/location-constants'
import type { Template } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { DEFAULT_FILE_SORT, EMPTY_LISTING, NO_SELECTION } from '../constants/download-constants'
import { STORAGE_HEADINGS } from '../constants/platform-constants'
import { appService } from '../services/app-service'
import { downloadService } from '../services/download-service'
import { Button } from '../theme/components/Button'
import { CopyButton } from '../theme/components/CopyButton'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageLayout } from '../theme/components/PageLayout'
import { SearchField } from '../theme/components/SearchField'
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
  addSummaries,
  appendListing,
  deleteTitle,
  deletedMessage,
  deleteWarning,
  downloadsStartedMessage,
  downloadStartedMessage,
  filterListing,
  folderDownloadMessage,
  folderOf,
  insideLine,
  isEmptyFolder,
  namesWithMore,
  nextSort,
  restoringMessage,
  samePlace,
  selectedFiles
} from '../utils/download-utils'
import { messageOf } from '../utils/error-utils'
import { isSearching } from '../utils/search-utils'
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
  const [selectedFolders, setSelectedFolders] = useState<ReadonlySet<string>>(NO_SELECTION)
  // The sort stays while other folders and templates open.
  const [sort, setSort] = useState<FileSort>(DEFAULT_FILE_SORT)
  // The search covers the open folder, and empties when another opens.
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<FileDialog>({ kind: 'none' })
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const template = selectedTemplate(templates, place.templateId)
  const current = shown !== null && samePlace(shown.place, place) ? shown : null
  const listing = current !== null && current.state === 'loaded' ? current.listing : EMPTY_LISTING
  const { files, folders } = listing
  const found = filterListing(listing, search)
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
    setSelectedFolders(NO_SELECTION)
    setSearch('')
    setPlace(next)
  }
  const openPath = (path: FolderEntry[]): void => goTo({ templateId: place.templateId, path })
  const openFolder = (entry: FolderEntry): void => openPath([...place.path, entry])

  const changeListing = (change: (listing: FolderListing) => FolderListing): void =>
    setShown((previous) =>
      previous !== null && previous.state === 'loaded'
        ? { ...previous, listing: change(previous.listing) }
        : previous
    )

  const toggle =
    (set: Dispatch<SetStateAction<ReadonlySet<string>>>) =>
    (key: string, on: boolean): void =>
      set((previous) => {
        const next = new Set(previous)
        if (on) next.add(key)
        else next.delete(key)
        return next
      })

  // Selects or clears the entries shown, and keeps the choice for those the search hides.
  const withShown =
    (keys: string[], on: boolean) =>
    (previous: ReadonlySet<string>): ReadonlySet<string> => {
      const next = new Set(previous)
      for (const key of keys) {
        if (on) next.add(key)
        else next.delete(key)
      }
      return next
    }

  const closeDialog = useCallback((): void => {
    setDialog({ kind: 'none' })
    setDialogError(undefined)
  }, [])

  // Opens the Delete or Restore dialog. With folders in it, it first counts what they hold, at any depth.
  const openDialog = (
    kind: 'delete' | 'restore',
    targets: StoredFile[],
    targetFolders: FolderEntry[]
  ): void => {
    setDialogError(undefined)
    setDialog({
      kind,
      files: targets,
      folders: targetFolders,
      inside: targetFolders.length === 0 ? addSummaries([]) : null
    })
    if (targetFolders.length === 0) return
    Promise.all(
      targetFolders.map((entry) =>
        downloadService.summarizeFolder({ templateId: template.id, folder: entry.id })
      )
    ).then(
      (summaries) =>
        setDialog((open) =>
          open.kind === kind && open.folders === targetFolders
            ? { ...open, inside: addSummaries(summaries) }
            : open
        ),
      (reason: unknown) => setDialogError(messageOf(reason))
    )
  }

  // Acts on each file, then each folder, in turn. If one fails, what's done so far shows as done, and the dialog stays
  // open with the rest.
  const runOnEach = async (
    targets: { files: StoredFile[]; folders: FolderEntry[] },
    act: {
      file: (file: StoredFile) => Promise<void>
      folder: (entry: FolderEntry) => Promise<void>
    },
    showDone: (keys: ReadonlySet<string>, folderIds: ReadonlySet<string>) => void,
    done: () => string
  ): Promise<void> => {
    setDialogBusy(true)
    setDialogError(undefined)
    const finished = new Set<string>()
    const finishedFolders = new Set<string>()
    try {
      for (const file of targets.files) {
        await act.file(file)
        finished.add(file.key)
      }
      for (const entry of targets.folders) {
        await act.folder(entry)
        finishedFolders.add(entry.id)
      }
      closeDialog()
      setMessage(done())
    } catch (reason) {
      setDialog((open) =>
        open.kind === 'none'
          ? open
          : {
              ...open,
              files: targets.files.filter((file) => !finished.has(file.key)),
              folders: targets.folders.filter((entry) => !finishedFolders.has(entry.id))
            }
      )
      setDialogError(messageOf(reason))
    } finally {
      showDone(finished, finishedFolders)
      setDialogBusy(false)
    }
  }

  const without = (keys: ReadonlySet<string>) => (previous: ReadonlySet<string>) =>
    new Set([...previous].filter((key) => !keys.has(key)))

  const deleteSelection = (targets: StoredFile[], targetFolders: FolderEntry[]): Promise<void> =>
    runOnEach(
      { files: targets, folders: targetFolders },
      {
        file: (file) => downloadService.delete({ templateId: template.id, key: file.key }),
        folder: (entry) =>
          downloadService.deleteFolder({ templateId: template.id, folder: entry.id })
      },
      (keys, folderIds) => {
        changeListing((listing) => ({
          ...listing,
          files: listing.files.filter((file) => !keys.has(file.key)),
          folders: listing.folders.filter((entry) => !folderIds.has(entry.id))
        }))
        setSelected(without(keys))
        setSelectedFolders(without(folderIds))
      },
      () => deletedMessage(targets, template.platform, targetFolders)
    )

  const restoreSelection = (
    targets: StoredFile[],
    targetFolders: FolderEntry[],
    options: RestoreOptions
  ): Promise<void> => {
    let inFolders = 0
    return runOnEach(
      { files: targets, folders: targetFolders },
      {
        file: (file) =>
          downloadService.restore({ templateId: template.id, key: file.key, options }),
        folder: async (entry) => {
          inFolders += await downloadService.restoreFolder({
            templateId: template.id,
            folder: entry.id,
            options
          })
        }
      },
      (keys) =>
        changeListing((listing) => ({
          ...listing,
          files: listing.files.map((file) =>
            keys.has(file.key) ? { ...file, access: { state: 'restoring' } } : file
          )
        })),
      () => restoringMessage(targets, template.platform, inFolders)
    )
  }

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

  // Queues each file, then each folder's files, in turn, and stops at the first one main refuses.
  const download = async (targets: StoredFile[], targetFolders: FolderEntry[]): Promise<void> => {
    setMessage(undefined)
    setError(undefined)
    try {
      const savedAs: string[] = []
      for (const file of targets) {
        savedAs.push(await downloadService.download({ templateId: template.id, key: file.key }))
      }
      const results: FolderDownload[] = []
      for (const entry of targetFolders) {
        results.push(
          await downloadService.downloadFolder({ templateId: template.id, folder: entry.id })
        )
      }
      if (results.length > 0) setMessage(folderDownloadMessage(targets.length, results))
      else {
        setMessage(
          targets.length === 1
            ? downloadStartedMessage(targets[0].name, savedAs[0])
            : downloadsStartedMessage(targets.length)
        )
      }
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  return (
    <PageLayout
      title="Browse"
      description="Open folders to find a file. Download saves it in your download folder; archived files need a restore first. Select files and folders to act on them together."
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
            {!isEmptyFolder(current.listing) && (
              <SearchField
                label="Search this folder"
                value={search}
                className="mb-4"
                onChange={setSearch}
              />
            )}
            <SelectionBar
              files={selectedFiles(files, selected)}
              folders={folders.filter((entry) => selectedFolders.has(entry.id))}
              foldersRestore={template.platform !== 'google-drive'}
              onDownload={(targets, targetFolders) => void download(targets, targetFolders)}
              onRestore={(targets, targetFolders) => openDialog('restore', targets, targetFolders)}
              onDelete={(targets, targetFolders) => openDialog('delete', targets, targetFolders)}
              onClear={() => {
                setSelected(NO_SELECTION)
                setSelectedFolders(NO_SELECTION)
              }}
            />
            <FolderTable
              listing={found}
              storageHeading={STORAGE_HEADINGS[template.platform]}
              sort={sort}
              searching={isSearching(search)}
              onSort={(by) => setSort((previous) => nextSort(previous, by))}
              loadingMore={loadingMore}
              selected={selected}
              selectedFolders={selectedFolders}
              onSelect={toggle(setSelected)}
              onSelectFolder={toggle(setSelectedFolders)}
              onSelectAll={(on) => {
                setSelected(
                  withShown(
                    found.files.map((file) => file.key),
                    on
                  )
                )
                setSelectedFolders(
                  withShown(
                    found.folders.map((entry) => entry.id),
                    on
                  )
                )
              }}
              onOpenFolder={openFolder}
              onDownload={(file) => void download([file], [])}
              onRestore={(file) => openDialog('restore', [file], [])}
              onDelete={(file) => openDialog('delete', [file], [])}
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
          title={deleteTitle(dialog.files, dialog.folders)}
          message={
            <>
              <p>
                <strong>{namesWithMore([...dialog.folders, ...dialog.files])}</strong>{' '}
                {deleteWarning(
                  template.platform,
                  rootLabel(template),
                  dialog.files.length + dialog.folders.length
                )}
              </p>
              {dialog.folders.length > 0 && (
                <p className="mt-3">{insideLine(dialog.folders, dialog.inside)}</p>
              )}
            </>
          }
          confirmLabel="Delete"
          confirmIcon={<DeleteIcon />}
          busy={dialogBusy || dialog.inside === null}
          error={dialogError}
          onConfirm={() => void deleteSelection(dialog.files, dialog.folders)}
          onCancel={closeDialog}
        />
      )}
      {dialog.kind === 'restore' && template.platform === 'azure' && (
        <RehydrateDialog
          files={dialog.files}
          folders={dialog.folders}
          inside={dialog.inside}
          busy={dialogBusy}
          error={dialogError}
          onRestore={(tier, priority) =>
            void restoreSelection(dialog.files, dialog.folders, {
              platform: 'azure',
              tier,
              priority
            })
          }
          onCancel={closeDialog}
        />
      )}
      {dialog.kind === 'restore' && template.platform === 's3' && (
        <RestoreDialog
          files={dialog.files}
          folders={dialog.folders}
          inside={dialog.inside}
          defaultTier={restoreDefaults.tier}
          defaultDays={restoreDefaults.days}
          busy={dialogBusy}
          error={dialogError}
          onRestore={(tier, days) =>
            void restoreSelection(dialog.files, dialog.folders, { platform: 's3', tier, days })
          }
          onCancel={closeDialog}
        />
      )}
    </PageLayout>
  )
}
