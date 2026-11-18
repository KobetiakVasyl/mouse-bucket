// A section of a page: its title, an optional line that explains it, a divider, then its content. Its title names it for
// screen readers. See docs/UI.md.
import { type ReactNode, useId } from 'react'

export function Section({
  title,
  description,
  className = '',
  children
}: {
  title: string
  description?: ReactNode
  className?: string
  children: ReactNode
}): React.JSX.Element {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={className}>
      <header className="mb-4 border-b border-line pb-3">
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        {description !== undefined && <div className="mt-1 text-sm text-muted">{description}</div>}
      </header>
      {children}
    </section>
  )
}
