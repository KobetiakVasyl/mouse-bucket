// With --launch-check, quits once the page has rendered, or with a code for how its launch failed. CI starts built apps with it. See docs/ENVIRONMENTS.md.
import {
  LAUNCH_CHECK_DEFAULTS,
  LaunchCheckExit,
  RENDERED_CHECK
} from '../constants/launch-check-constants'
import type { LaunchCheckOptions, LaunchContents } from '../types/launch-check-types'
import { pollUntil } from '../utils/poll-utils'

export class LaunchCheckService {
  private readonly options: LaunchCheckOptions

  constructor(
    private readonly exit: (code: number) => void,
    options: Partial<LaunchCheckOptions> = {}
  ) {
    this.options = { ...LAUNCH_CHECK_DEFAULTS, ...options }
  }

  // Exits with the first outcome of the window's launch: rendered, or how it failed.
  watch(contents: LaunchContents): void {
    const { timeoutMs, attempts, delayMs } = this.options
    let finished = false
    let timer: ReturnType<typeof setTimeout> | undefined = undefined
    const finish = (code: number): void => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      this.exit(code)
    }
    timer = setTimeout(() => finish(LaunchCheckExit.timedOut), timeoutMs)

    contents.on('render-process-gone', () => finish(LaunchCheckExit.rendererGone))
    contents.on('did-fail-load', (_event, _errorCode, _description, _url, isMainFrame) => {
      if (isMainFrame) finish(LaunchCheckExit.loadFailed)
    })
    contents.once('did-finish-load', () => {
      const isRendered = async (): Promise<boolean> =>
        (await contents.executeJavaScript(RENDERED_CHECK)) === true
      pollUntil(isRendered, attempts, delayMs)
        .then((rendered) =>
          finish(rendered ? LaunchCheckExit.rendered : LaunchCheckExit.notRendered)
        )
        .catch(() => finish(LaunchCheckExit.notRendered))
    })
  }
}
