// The outcome of the last action, such as a file added to the transfers; nothing while there's none. See docs/UI.md.
export function StatusMessage({
  message,
  className = ''
}: {
  message: string | undefined
  className?: string
}): React.JSX.Element | null {
  if (message === undefined) return null
  return (
    <p role="status" className={className}>
      {message}
    </p>
  )
}
