// An area that takes files and folders dropped on it, with the buttons that pick them instead. See docs/UI.md.
import { type ReactNode, useState } from 'react'

export function DropZone({
  onDrop,
  children
}: {
  onDrop: (files: File[]) => void
  children: ReactNode
}): React.JSX.Element {
  const [over, setOver] = useState(false)
  return (
    <section
      aria-label="Drop files or folders here"
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        onDrop(Array.from(event.dataTransfer.files))
      }}
      className={`mt-6 flex max-w-3xl flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center ${over ? 'border-ink bg-hover' : 'border-line'}`}
    >
      <p className="text-lg">Drop files or folders here, or</p>
      <div className="flex flex-wrap justify-center gap-3">{children}</div>
    </section>
  )
}
