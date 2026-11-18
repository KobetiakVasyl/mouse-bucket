// A full-width table inside a rounded frame. See docs/UI.md.
import type { ReactNode } from 'react'

export function TableFrame({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  )
}
