// Checks who sent an IPC request and what it contains, and turns any failure into a safe message. See docs/SECURITY.md.
import type { z } from 'zod'
import type { IpcResult } from '../../shared/channels'
import { describeError } from '../errors'

// Only the app's own page may call main: the built index.html, or the hot-reload server's origin.
// Windows paths ignore case, and Chromium may spell the drive letter differently than the app was started with.
export function isTrustedSender(frameUrl: string, appUrl: string, platform: string): boolean {
  if (!URL.canParse(frameUrl)) return false
  const frame = new URL(frameUrl)
  const expected = new URL(appUrl)
  if (expected.protocol !== 'file:') return frame.origin === expected.origin
  if (frame.protocol !== 'file:') return false
  if (platform !== 'win32') return frame.pathname === expected.pathname
  return frame.pathname.toLowerCase() === expected.pathname.toLowerCase()
}

export async function runHandler<S extends z.ZodType, R>(
  schema: S,
  payload: unknown,
  handler: (input: z.output<S>) => Promise<R>
): Promise<IpcResult<R>> {
  const parsed = schema.safeParse(payload)
  // A failed parse always has at least one issue.
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  try {
    return { ok: true, value: await handler(parsed.data) }
  } catch (error) {
    return { ok: false, error: describeError(error) }
  }
}
