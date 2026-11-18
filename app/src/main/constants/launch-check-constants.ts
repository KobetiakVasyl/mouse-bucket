// The --launch-check switch CI starts built apps with, the exit code for each outcome, and its timing. See docs/ENVIRONMENTS.md.
import type { LaunchCheckOptions } from '../types/launch-check-types'

export const LAUNCH_CHECK_SWITCH = 'launch-check'

export const LaunchCheckExit = {
  rendered: 0,
  notRendered: 10,
  rendererGone: 11,
  timedOut: 12,
  alreadyRunning: 13,
  loadFailed: 14
} as const

// It gives up after 30 seconds, and asks the page whether it rendered up to 20 times, every 250 ms.
export const LAUNCH_CHECK_DEFAULTS: LaunchCheckOptions = {
  timeoutMs: 30_000,
  attempts: 20,
  delayMs: 250
}

// The page marks <html> with data-state="ready" once it loaded its data from main.
export const RENDERED_CHECK = "document.documentElement.dataset.state === 'ready'"
