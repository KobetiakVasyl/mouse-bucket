// Formats sizes and dates for display. See docs/UI.md.
const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return unit === 0 ? `${value} ${UNITS[0]}` : `${value.toFixed(value < 10 ? 1 : 0)} ${UNITS[unit]}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}
