// What the launch check watches, and its timing, which tests shorten. See docs/ENVIRONMENTS.md.
import type { WebContents } from 'electron'

export type LaunchContents = Pick<WebContents, 'on' | 'once' | 'executeJavaScript'>

export interface LaunchCheckOptions {
  timeoutMs: number
  attempts: number
  delayMs: number
}
