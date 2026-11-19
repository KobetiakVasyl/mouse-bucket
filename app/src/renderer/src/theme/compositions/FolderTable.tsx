// One folder of a bucket, container or Drive folder: its subfolders, and its files with their size, storage class or
// access tier where the platform has one, date and actions, sorted by name or date. Each folder and file has a
// checkbox. See docs/UI.md.
import type { FolderEntry, FolderListing, StoredFile } from '../../../../shared/types/storage-types'
import { formatBytes, formatDate } from '../../utils/format-utils'
import type { FileSort, FileSortKey } from '../../types/download-types'
import { accessNote, isDownloadable, isEmptyFolder, sortFiles } from '../../utils/download-utils'
import { storageClassLabel } from '../../utils/storage-utils'
import { Button } from '../components/Button'
import { Checkbox } from '../components/Checkbox'
import { LinkButton } from '../components/LinkButton'
import { SortHeader } from '../components/SortHeader'
import { TableFrame } from '../components/TableFrame'
import { CELL, TABLE_HEAD_ROW, TABLE_ROW } from '../styles/style-constants'
import {
  DeleteIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  LoadMoreIcon,
  RestoreIcon
} from '../components/icons'

export function FolderTable({
  listing,
  storageHeading,
  sort,
  loadingMore,
  selected,
  selectedFolders,
  onSelect,
  onSelectFolder,
  onSelectAll,
  onOpenFolder,
  onDownload,
  onRestore,
  onDelete,
  onSort,
  onLoadMore
}: {
  listing: FolderListing
  // The storage column's heading, or null for a platform without storage classes, which shows file notes by the name.
  storageHeading: string | null
  sort: FileSort
  loadingMore: boolean
  selected: ReadonlySet<string>
  selectedFolders: ReadonlySet<string>
  onSelect: (key: string, selected: boolean) => void
  onSelectFolder: (id: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onOpenFolder: (folder: FolderEntry) => void
  onDownload: (file: StoredFile) => void
  onRestore: (file: StoredFile) => void
  onDelete: (file: StoredFile) => void
  onSort: (by: FileSortKey) => void
  onLoadMore: (continuationToken: string) => void
}): React.JSX.Element {
  if (isEmptyFolder(listing)) return <p className="text-muted">This folder is empty.</p>
  const { nextToken } = listing
  const allSelected =
    listing.files.every((file) => selected.has(file.key)) &&
    listing.folders.every((folder) => selectedFolders.has(folder.id))
  const directionOf = (by: FileSortKey): FileSort['direction'] | null =>
    sort.by === by ? sort.direction : null
  return (
    <>
      <TableFrame>
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={`${CELL} w-10`}>
              <Checkbox
                label="Select all files and folders"
                checked={allSelected}
                onChange={onSelectAll}
              />
            </th>
            <SortHeader
              label="Name"
              direction={directionOf('name')}
              onSort={() => onSort('name')}
            />
            <th className={CELL}>Size</th>
            {storageHeading !== null && <th className={CELL}>{storageHeading}</th>}
            <SortHeader
              label="Modified"
              direction={directionOf('modified')}
              onSort={() => onSort('modified')}
            />
            <th className={CELL} />
          </tr>
        </thead>
        <tbody>
          {listing.folders.map((folder) => (
            <tr key={folder.id} className={TABLE_ROW}>
              <td className={CELL}>
                <Checkbox
                  label={`Select folder ${folder.name}`}
                  checked={selectedFolders.has(folder.id)}
                  onChange={(checked) => onSelectFolder(folder.id, checked)}
                />
              </td>
              <td className={CELL}>
                <LinkButton onClick={() => onOpenFolder(folder)}>
                  <FolderIcon className="text-muted" />
                  {folder.name}
                </LinkButton>
              </td>
              <td className={`${CELL} text-muted`}>Folder</td>
              {storageHeading !== null && <td className={CELL} />}
              <td className={CELL} />
              <td className={CELL} />
            </tr>
          ))}
          {sortFiles(listing.files, sort).map((file) => (
            <tr key={file.key} className={TABLE_ROW}>
              <td className={CELL}>
                <Checkbox
                  label={`Select ${file.name}`}
                  checked={selected.has(file.key)}
                  onChange={(checked) => onSelect(file.key, checked)}
                />
              </td>
              <td className={CELL}>
                <span className="flex items-center gap-2">
                  <FileIcon className="text-muted" />
                  <span className="break-words">{file.name}</span>
                </span>
                {storageHeading === null && file.access.state !== 'available' && (
                  <span className="block text-sm text-muted">{accessNote(file.access)}</span>
                )}
              </td>
              <td className={`${CELL} whitespace-nowrap`}>{formatBytes(file.size)}</td>
              {storageHeading !== null && (
                <td className={CELL}>
                  {storageClassLabel(file.storageClass)}
                  {file.access.state !== 'available' && (
                    <span className="block text-sm text-muted">{accessNote(file.access)}</span>
                  )}
                </td>
              )}
              <td className={`${CELL} whitespace-nowrap`}>{formatDate(file.lastModified)}</td>
              <td className={CELL}>
                <div className="flex flex-wrap justify-end gap-2">
                  {isDownloadable(file) && (
                    <Button className="text-sm" onClick={() => onDownload(file)}>
                      <DownloadIcon />
                      Download
                    </Button>
                  )}
                  {file.access.state === 'archived' && (
                    <Button className="text-sm" variant="positive" onClick={() => onRestore(file)}>
                      <RestoreIcon />
                      Restore
                    </Button>
                  )}
                  <Button className="text-sm" variant="danger" onClick={() => onDelete(file)}>
                    <DeleteIcon />
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
      {nextToken !== null && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {sort.by === 'modified' && (
            <span className="text-sm text-muted">The sort covers the files loaded so far.</span>
          )}
          <Button disabled={loadingMore} onClick={() => onLoadMore(nextToken)}>
            <LoadMoreIcon />
            Load more
          </Button>
        </div>
      )}
    </>
  )
}
