// A boxed note at the top of a page, as wide as the page, such as a first-run hint. See docs/UI.md.
import type { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="mb-6 rounded-xl border border-line bg-surface p-4">{children}</div>
}
