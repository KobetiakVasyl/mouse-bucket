// Preformatted text in the system's monospace font, selected whole on click, with an optional Copy button on the right
// above it. See docs/UI.md.
import { CopyButton } from './CopyButton'

export function CodeBlock({
  text,
  onCopy
}: {
  text: string
  onCopy?: (text: string) => Promise<void>
}): React.JSX.Element {
  return (
    <div>
      {onCopy !== undefined && (
        <div className="mb-2 flex justify-end">
          <CopyButton text={text} className="text-sm" onCopy={onCopy} />
        </div>
      )}
      <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-4 text-sm select-all">
        {text}
      </pre>
    </div>
  )
}
