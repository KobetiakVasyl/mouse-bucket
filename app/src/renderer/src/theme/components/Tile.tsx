// A large button with a title and a description, disabled while it isn't available. See docs/UI.md.
import { FOCUS } from '../styles/style-constants'

export function Tile({
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
      className={`flex min-h-40 flex-col items-start rounded-2xl border border-line bg-surface p-6 text-left hover:border-muted hover:bg-hover disabled:pointer-events-none disabled:opacity-40 ${FOCUS}`}
    >
      <span className="mb-2 text-3xl font-semibold">{title}</span>
      <span className="text-muted">{description}</span>
    </button>
  )
}
