// A boxed note at the top of a page, such as a first-run hint. See docs/UI.md.
import type { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }): React.JSX.Element {
  return <p className="mb-6 max-w-3xl rounded-xl border border-line bg-surface p-4">{children}</p>
}
