// The Home page: the Upload and Download tiles, and the transfers. See docs/UI.md.
import type { Template, Transfer } from '../../../shared/ipc'
import { TransferList } from '../components/TransferList'
import { PageHeading } from '../components/ui'
import type { Page } from '../navigation'

function Tile({
  title,
  description,
  available,
  onClick
}: {
  title: string
  description: string
  available: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      className="flex min-h-40 flex-col items-start rounded-2xl border border-line bg-surface p-6 text-left hover:border-muted hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-40"
    >
      <span className="mb-2 text-3xl font-semibold">{title}</span>
      <span className="text-muted">{description}</span>
    </button>
  )
}

export function HomePage({
  templates,
  transfers,
  onNavigate
}: {
  templates: Template[]
  transfers: Transfer[]
  onNavigate: (page: Page) => void
}): React.JSX.Element {
  const kinds = new Set(templates.map((template) => template.kind))
  return (
    <>
      <PageHeading title="Home" />
      <div className="grid max-w-3xl grid-cols-2 gap-6">
        <Tile
          title="Upload"
          available={kinds.has('upload')}
          description={
            kinds.has('upload')
              ? 'Send files from this computer to a bucket folder.'
              : 'Add an upload template first.'
          }
          onClick={() => onNavigate('upload')}
        />
        <Tile
          title="Download"
          available={kinds.has('download')}
          description={
            kinds.has('download')
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
