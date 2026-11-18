// A titled, rounded box, such as a section of How it works: its title with an optional badge, a divider, then its
// content. See docs/UI.md.
import type { ReactNode } from 'react'
import { Badge } from './Badge'

export function Card({
  title,
  badge,
  className = '',
  children
}: {
  title: string
  badge?: string
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className={`rounded-xl border border-line bg-surface p-6 ${className}`}>
      <h2 className="mb-4 flex items-center gap-3 border-b border-line pb-3 text-xl font-semibold">
        {title}
        {badge !== undefined && <Badge label={badge} />}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
