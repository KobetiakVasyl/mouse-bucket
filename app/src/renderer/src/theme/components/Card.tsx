// A titled, rounded box, such as a section of How it works. See docs/UI.md.
import type { ReactNode } from 'react'

export function Card({
  title,
  className = '',
  children
}: {
  title: string
  className?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className={`rounded-xl border border-line bg-surface p-6 ${className}`}>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
