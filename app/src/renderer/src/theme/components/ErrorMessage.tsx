// An error, marked by its red edge; nothing while there's none. See docs/UI.md.
export function ErrorMessage({
  message
}: {
  message: string | undefined
}): React.JSX.Element | null {
  if (message === undefined) return null
  return (
    <p
      role="alert"
      className="mt-4 max-w-3xl rounded-xl border border-l-4 border-line border-l-danger bg-surface p-3 font-semibold"
    >
      {message}
    </p>
  )
}
