// A page's title, with an optional line that explains the page. See docs/UI.md.
import type { ReactNode } from 'react'

export function PageHeading({
  title,
  children
}: {
  title: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children !== undefined && <p className="mt-2 max-w-3xl text-muted">{children}</p>}
    </header>
  )
}
