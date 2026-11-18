// The path to the open folder: the template's bucket, container or Drive folder, then each folder on the way, each one
// a link. See docs/UI.md.
import type { FolderEntry } from '../../../../shared/types/storage-types'
import { LinkButton } from '../components/LinkButton'

export function FolderBreadcrumb({
  root,
  path,
  onOpenPath
}: {
  root: string
  path: FolderEntry[]
  onOpenPath: (path: FolderEntry[]) => void
}): React.JSX.Element {
  return (
    <nav aria-label="Folder" className="flex flex-wrap gap-x-2 text-base text-ink">
      <LinkButton onClick={() => onOpenPath([])}>{root}</LinkButton>
      {path.map((folder, index) => (
        <span key={folder.id} className="flex gap-x-2">
          <span aria-hidden="true" className="text-muted">
            /
          </span>
          <LinkButton onClick={() => onOpenPath(path.slice(0, index + 1))}>
            {folder.name}
          </LinkButton>
        </span>
      ))}
    </nav>
  )
}
