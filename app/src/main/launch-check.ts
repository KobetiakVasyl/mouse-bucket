// `--launch-check` quits once the page has rendered. CI starts built apps with it. See docs/ENVIRONMENTS.md.
import type { WebContents } from 'electron'

export const LAUNCH_CHECK_SWITCH = 'launch-check'

export const LaunchCheckExit = {
  rendered: 0,
  notRendered: 10,
  rendererGone: 11,
  timedOut: 12,
  alreadyRunning: 13,
  loadFailed: 14
} as const

export const LAUNCH_CHECK_TIMEOUT_MS = 30_000

const RENDERED_CHECK = "document.documentElement.dataset.state === 'ready'"

// Polls until the page reports that React rendered something into #root.
export async function waitUntilRendered(
  isRendered: () => Promise<boolean>,
  attempts = 20,
  delayMs = 250
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await isRendered()) return true
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  return false
}

export interface WatchLaunchOptions {
  timeoutMs?: number
  attempts?: number
  delayMs?: number
}

// Exits with the first outcome of the window's launch: rendered, or how it failed.
export function watchLaunch(
  contents: Pick<WebContents, 'on' | 'once' | 'executeJavaScript'>,
  exit: (code: number) => void,
  { timeoutMs = LAUNCH_CHECK_TIMEOUT_MS, attempts, delayMs }: WatchLaunchOptions = {}
): void {
  let finished = false
  const timer = setTimeout(() => finish(LaunchCheckExit.timedOut), timeoutMs)

  function finish(code: number): void {
    if (finished) return
    finished = true
    clearTimeout(timer)
    exit(code)
  }

  contents.on('render-process-gone', () => finish(LaunchCheckExit.rendererGone))
  contents.on('did-fail-load', (_event, _errorCode, _description, _url, isMainFrame) => {
    if (isMainFrame) finish(LaunchCheckExit.loadFailed)
  })
  contents.once('did-finish-load', () => {
    const isRendered = async (): Promise<boolean> =>
      (await contents.executeJavaScript(RENDERED_CHECK)) === true
    waitUntilRendered(isRendered, attempts, delayMs)
      .then((rendered) => finish(rendered ? LaunchCheckExit.rendered : LaunchCheckExit.notRendered))
      .catch(() => finish(LaunchCheckExit.notRendered))
  })
}
