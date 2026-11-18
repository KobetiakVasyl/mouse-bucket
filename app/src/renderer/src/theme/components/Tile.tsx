// A large button that fills its space, with an icon, a title and a description, disabled while it isn't available. Its
// icon and text scale down with the tile, so they fit a small window. See docs/UI.md.
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
      className={`flex h-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface p-6 text-center [container-type:size] hover:border-muted hover:bg-hover disabled:pointer-events-none disabled:opacity-40 ${FOCUS}`}
    >
      <span className="mb-[4cqmin] text-muted [font-size:clamp(1.5rem,16cqmin,3rem)]">{icon}</span>
      <span className="mb-[3cqmin] leading-tight font-semibold [font-size:clamp(1.25rem,11cqmin,2.25rem)]">
        {title}
      </span>
      <span className="max-w-sm text-muted [font-size:clamp(0.75rem,4.5cqmin,1rem)]">
        {description}
      </span>
    </button>
  )
}
