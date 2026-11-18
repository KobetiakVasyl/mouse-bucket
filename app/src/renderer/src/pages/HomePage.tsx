// The Home page: the Upload and Browse tiles, each half the page wide and about two thirds of the window tall, then the
// transfers. With no templates yet, a notice leads to Templates. See docs/UI.md.
import type { Template } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { FIRST_TEMPLATE_MESSAGE } from '../constants/template-constants'
import { Button } from '../theme/components/Button'
import { Notice } from '../theme/components/Notice'
import { PageLayout } from '../theme/components/PageLayout'
import { Tile } from '../theme/components/Tile'
import { TransferList } from '../theme/compositions/TransferList'
import type { Page } from '../types/navigation-types'
import { hasKind } from '../utils/template-utils'
import { AddIcon, BrowseIcon, UploadIcon } from '../theme/components/icons'

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
    <PageLayout title="Home">
      {templates.length === 0 && (
        <Notice>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{FIRST_TEMPLATE_MESSAGE}</p>
            <Button variant="primary" onClick={() => onNavigate('templates')}>
              <AddIcon />
              Add a template
            </Button>
          </div>
        </Notice>
      )}
      <div className="grid h-[65vh] min-h-72 grid-cols-2 gap-6">
        <Tile
          icon={<UploadIcon />}
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
          icon={<BrowseIcon />}
          title="Browse"
          available={canDownload}
          description={
            canDownload
              ? 'Browse a bucket, then download, restore or delete its files.'
              : 'Add a download template first.'
          }
          onClick={() => onNavigate('download')}
        />
      </div>
      <TransferList transfers={transfers} />
    </PageLayout>
  )
}
