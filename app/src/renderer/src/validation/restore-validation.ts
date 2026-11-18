// Checks the Restore dialog's number of days before the request is sent. See docs/UI.md.
import { RESTORE_DAYS } from '../../../shared/constants/storage-constants'

// The number of days typed in, or null when it isn't a whole number in the allowed range.
export function parseRestoreDays(text: string): number | null {
  if (text.trim() === '') return null
  const days = Number(text)
  if (!Number.isInteger(days)) return null
  return days >= RESTORE_DAYS.min && days <= RESTORE_DAYS.max ? days : null
}
