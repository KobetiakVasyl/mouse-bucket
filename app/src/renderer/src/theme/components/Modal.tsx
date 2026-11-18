// A dialog over the page. Escape closes it. See docs/UI.md.
import { type ReactNode, useEffect } from 'react'

export function Modal({
  title,
  onClose,
  children
}: {
  title: string
  onClose: () => void
  children: ReactNode
}): React.JSX.Element {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-paper/80 p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8"
      >
        <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
