// What can be done with the selected files and folders: each button counts what it applies to, a folder counting once
// for everything inside it. See docs/UI.md.
import type { FolderEntry, StoredFile } from '../../../../shared/types/storage-types'
import { archivedFiles, downloadableFiles, selectionLabel } from '../../utils/download-utils'
import { Button } from '../components/Button'
import { CancelIcon, DeleteIcon, DownloadIcon, RestoreIcon } from '../components/icons'

export function SelectionBar({
  files,
  folders,
  foldersRestore,
  onDownload,
  onRestore,
  onDelete,
  onClear
}: {
  files: StoredFile[]
  folders: FolderEntry[]
  // Whether folders can hold archived files to restore, which Google Drive's can't.
  foldersRestore: boolean
  onDownload: (files: StoredFile[], folders: FolderEntry[]) => void
  onRestore: (files: StoredFile[], folders: FolderEntry[]) => void
  onDelete: (files: StoredFile[], folders: FolderEntry[]) => void
  onClear: () => void
}): React.JSX.Element | null {
  if (files.length === 0 && folders.length === 0) return null
  const downloadable = downloadableFiles(files)
  const archived = archivedFiles(files)
  const restoreFolders = foldersRestore ? folders : []
  return (
    <div
      role="toolbar"
      aria-label="Selected files"
      className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
    >
      <span className="mr-auto font-semibold">
        {selectionLabel(files.length, folders.length)} selected
      </span>
      <Button
        className="text-sm"
        disabled={downloadable.length + folders.length === 0}
        onClick={() => onDownload(downloadable, folders)}
      >
        <DownloadIcon />
        Download ({downloadable.length + folders.length})
      </Button>
      <Button
        className="text-sm"
        variant="positive"
        disabled={archived.length + restoreFolders.length === 0}
        onClick={() => onRestore(archived, restoreFolders)}
      >
        <RestoreIcon />
        Restore ({archived.length + restoreFolders.length})
      </Button>
      <Button className="text-sm" variant="danger" onClick={() => onDelete(files, folders)}>
        <DeleteIcon />
        Delete ({files.length + folders.length})
      </Button>
      <Button className="text-sm" onClick={onClear}>
        <CancelIcon />
        Clear selection
      </Button>
    </div>
  )
}
