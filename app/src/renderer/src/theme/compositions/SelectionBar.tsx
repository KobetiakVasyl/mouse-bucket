// What can be done with the selected files: each button counts the files it applies to. See docs/UI.md.
import type { S3File } from '../../../../shared/types/s3-types'
import { archivedFiles, downloadableFiles, fileCount } from '../../utils/download-utils'
import { Button } from '../components/Button'

export function SelectionBar({
  files,
  onDownload,
  onRestore,
  onDelete,
  onClear
}: {
  files: S3File[]
  onDownload: (files: S3File[]) => void
  onRestore: (files: S3File[]) => void
  onDelete: (files: S3File[]) => void
  onClear: () => void
}): React.JSX.Element | null {
  if (files.length === 0) return null
  const downloadable = downloadableFiles(files)
  const archived = archivedFiles(files)
  return (
    <div
      role="toolbar"
      aria-label="Selected files"
      className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3"
    >
      <span className="mr-auto font-semibold">{fileCount(files.length)} selected</span>
      <Button
        className="text-sm"
        disabled={downloadable.length === 0}
        onClick={() => onDownload(downloadable)}
      >
        Download ({downloadable.length})
      </Button>
      <Button
        className="text-sm"
        variant="positive"
        disabled={archived.length === 0}
        onClick={() => onRestore(archived)}
      >
        Restore ({archived.length})
      </Button>
      <Button className="text-sm" variant="danger" onClick={() => onDelete(files)}>
        Delete ({files.length})
      </Button>
      <Button className="text-sm" onClick={onClear}>
        Clear selection
      </Button>
    </div>
  )
}
