// Formats sizes and dates for display. See docs/UI.md.
import { SIZE_UNITS } from '../constants/format-constants'

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return unit === 0
    ? `${value} ${SIZE_UNITS[0]}`
    : `${value.toFixed(value < 10 ? 1 : 0)} ${SIZE_UNITS[unit]}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}
