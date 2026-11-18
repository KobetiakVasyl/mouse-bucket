// A large button that fills its space, with an icon, a title and a description, disabled while it isn't available. See docs/UI.md.
import { FOCUS } from '../styles/style-constants'

export function Tile({
  icon,
  title,
  description,
  available,
  onClick
}: {
  icon: React.JSX.Element
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
      className={`flex h-full flex-col items-center justify-center rounded-2xl border border-line bg-surface p-8 text-center hover:border-muted hover:bg-hover disabled:pointer-events-none disabled:opacity-40 ${FOCUS}`}
    >
      <span className="mb-4 text-5xl text-muted">{icon}</span>
      <span className="mb-3 text-4xl font-semibold">{title}</span>
      <span className="max-w-sm text-muted">{description}</span>
    </button>
  )
}
