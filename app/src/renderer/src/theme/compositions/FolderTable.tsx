// One folder of a bucket: its subfolders, and its files with size, storage class, date and actions. See docs/UI.md.
import type { FolderListing, S3File } from '../../../../shared/types/s3-types'
import { formatBytes, formatDate } from '../../utils/format-utils'
import { accessNote, folderName, isDownloadable, isEmptyFolder } from '../../utils/download-utils'
import { storageClassLabel } from '../../utils/storage-utils'
import { Button } from '../components/Button'
import { LinkButton } from '../components/LinkButton'
import { TableFrame } from '../components/TableFrame'
import { CELL, TABLE_HEAD_ROW, TABLE_ROW } from '../styles/style-constants'

export function FolderTable({
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
  if (isEmptyFolder(listing)) return <p className="text-muted">This folder is empty.</p>
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
                <LinkButton onClick={() => onOpenFolder(folder)}>
                  {folderName(folder, prefix)}
                </LinkButton>
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
                  {isDownloadable(file) && (
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
