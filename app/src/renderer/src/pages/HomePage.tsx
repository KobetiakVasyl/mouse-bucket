// The Home page: the Upload and Download tiles, and the transfers. See docs/UI.md.
import type { Template } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { PageHeading } from '../theme/components/PageHeading'
import { Tile } from '../theme/components/Tile'
import { TransferList } from '../theme/compositions/TransferList'
import type { Page } from '../types/navigation-types'
import { hasKind } from '../utils/template-utils'

export function HomePage({
  templates,
  transfers,
  onNavigate
}: {
  templates: Template[]
  transfers: Transfer[]
  onNavigate: (page: Page) => void
}): React.JSX.Element {
  const canUpload = hasKind(templates, 'upload')
  const canDownload = hasKind(templates, 'download')
  return (
    <>
      <PageHeading title="Home" />
      <div className="grid max-w-3xl grid-cols-2 gap-6">
        <Tile
          title="Upload"
          available={canUpload}
          description={
            canUpload
              ? 'Send files from this computer to a bucket folder.'
              : 'Add an upload template first.'
          }
          onClick={() => onNavigate('upload')}
        />
        <Tile
          title="Download"
          available={canDownload}
          description={
            canDownload
              ? 'Browse a bucket and save a file to this computer.'
              : 'Add a download template first.'
          }
          onClick={() => onNavigate('download')}
        />
      </div>
      <TransferList transfers={transfers} />
    </>
  )
}
