// The download folder: where downloads are saved, and the button that opens main's folder picker. See docs/UI.md.
import { Button } from '../components/Button'

export function DownloadFolderSetting({
  folder,
  busy,
  onChange
}: {
  folder: string
  busy: boolean
  onChange: () => void
}): React.JSX.Element {
  return (
    <section aria-label="Download folder">
      <h2 className="mb-1 font-semibold">Download folder</h2>
      <div className="flex items-center gap-3">
        <p
          className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface px-3 py-2"
          title={folder}
        >
          {folder}
        </p>
        <Button disabled={busy} onClick={onChange}>
          Change…
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Downloads are saved here. When a name is taken, the new file gets a number, such as report
        (2).pdf.
      </p>
    </section>
  )
}
