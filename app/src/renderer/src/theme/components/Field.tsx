// A labelled form control, with an optional hint below it. See docs/UI.md.
import type { ReactNode } from 'react'

export function Field({
  label,
  hint,
  children
}: {
  label: ReactNode
  hint?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 font-semibold">{label}</span>
      {children}
      {hint !== undefined && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  )
}
