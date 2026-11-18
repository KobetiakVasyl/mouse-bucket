// Turns a failed call to main into the message the page shows. See docs/UI.md.
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
