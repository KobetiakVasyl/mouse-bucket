// Every page's frame: centered within the app's maximum width, with the page's title, an optional line that explains the
// page, then a divider. See docs/UI.md.
import type { ReactNode } from 'react'

export function PageLayout({
  title,
  description,
  children
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-8 border-b border-line pb-4">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {description !== undefined && <p className="mt-2 text-muted">{description}</p>}
      </header>
      {children}
    </div>
  )
}
