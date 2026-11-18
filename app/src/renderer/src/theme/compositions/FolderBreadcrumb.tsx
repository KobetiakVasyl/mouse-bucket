// The path to the open folder: the bucket, then each folder on the way, each one a link. See docs/UI.md.
import { folderCrumbs } from '../../utils/download-utils'
import { LinkButton } from '../components/LinkButton'

export function FolderBreadcrumb({
  bucket,
  prefix,
  onOpenFolder
}: {
  bucket: string
  prefix: string
  onOpenFolder: (prefix: string) => void
}): React.JSX.Element {
  return (
    <nav aria-label="Folder" className="flex flex-wrap gap-x-2 text-base text-ink">
      <LinkButton onClick={() => onOpenFolder('')}>{bucket}</LinkButton>
      {folderCrumbs(prefix).map((crumb) => (
        <span key={crumb.prefix} className="flex gap-x-2">
          <span aria-hidden="true" className="text-muted">
            /
          </span>
          <LinkButton onClick={() => onOpenFolder(crumb.prefix)}>{crumb.name}</LinkButton>
        </span>
      ))}
    </nav>
  )
}
