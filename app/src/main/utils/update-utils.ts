// Whether this copy of the app can update itself, and safe messages for what went wrong. See docs/PACKAGING.md.
import {
  UPDATE_ERROR_MESSAGES,
  UPDATE_FAILED_MESSAGE,
  UPDATE_NETWORK_MESSAGE
} from '../constants/update-constants'
import type { UpdateSupportInputs } from '../types/update-types'
import { isRetryable, propertyOf } from './error-utils'

// Installed builds update themselves: the Windows installer's, and the AppImage. A run from source doesn't.
export function canUpdate({ isPackaged, platform, appImagePath }: UpdateSupportInputs): boolean {
  if (!isPackaged) return false
  if (platform === 'win32') return true
  return platform === 'linux' && appImagePath !== undefined
}

// electron-updater's own codes, then the network; its raw messages never reach the page.
export function describeUpdateError(error: unknown): string {
  const code = propertyOf(error, 'code')
  if (typeof code === 'string') {
    const message = UPDATE_ERROR_MESSAGES.get(code)
    if (message !== undefined) return message
  }
  if (isRetryable(error)) return UPDATE_NETWORK_MESSAGE
  return UPDATE_FAILED_MESSAGE
}
