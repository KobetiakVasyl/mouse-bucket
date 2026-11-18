// Preformatted text in the system's monospace font, selected whole on click. See docs/UI.md.
export function CodeBlock({ text }: { text: string }): React.JSX.Element {
  return (
    <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-4 text-sm select-all">
      {text}
    </pre>
  )
}
