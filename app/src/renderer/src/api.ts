// The renderer's typed access to main, exposed by the preload. See docs/ARCHITECTURE.md.
export const api = window.api

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
