// A section of a page: its title, an optional line that explains it, and its optional action buttons on the right,
// then a divider, then its content. Its title names it for screen readers. See docs/UI.md.
import { type ReactNode, useId } from 'react'

export function Section({
  title,
  description,
  actions,
  className = '',
  children
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={className}>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          {description !== undefined && (
            <div className="mt-1 text-sm text-muted">{description}</div>
          )}
        </div>
        {actions !== undefined && <div className="flex flex-wrap justify-end gap-3">{actions}</div>}
      </header>
      {children}
    </section>
  )
}
