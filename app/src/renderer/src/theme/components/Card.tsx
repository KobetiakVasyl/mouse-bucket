// A titled, rounded box, such as a section of How it works or a saved template: its title with an optional badge, an
// optional subtitle, a divider, its content, then its optional action buttons on the right. Its title names it for
// screen readers. See docs/UI.md.
import { type ReactNode, useId } from 'react'
import { Badge } from './Badge'

export function Card({
  title,
  badge,
  description,
  actions,
  headingLevel = 2,
  className = '',
  children
}: {
  title: string
  badge?: string
  description?: ReactNode
  actions?: ReactNode
  // 3 for cards inside a section, such as the saved templates.
  headingLevel?: 2 | 3
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const titleId = useId()
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <section
      aria-labelledby={titleId}
      className={`flex flex-col rounded-xl border border-line bg-surface p-6 ${className}`}
    >
      <header className="mb-4 border-b border-line pb-3">
        <Heading
          id={titleId}
          className={`flex flex-wrap items-center gap-3 font-semibold break-words ${headingLevel === 3 ? 'text-lg' : 'text-xl'}`}
        >
          {title}
          {badge !== undefined && <Badge label={badge} />}
        </Heading>
        {description !== undefined && <div className="mt-1 text-sm text-muted">{description}</div>}
      </header>
      <div className="flex-1 space-y-3">{children}</div>
      {actions !== undefined && (
        <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
      )}
    </section>
  )
}
