// A rounded progress bar. Without a total, it shows activity without an amount. See docs/UI.md.
import { PROGRESS_CLASS } from '../styles/style-constants'

export function ProgressBar({
  value,
  max
}: {
  value: number
  max: number | null
}): React.JSX.Element {
  if (max === null) return <progress className={PROGRESS_CLASS} />
  return <progress className={PROGRESS_CLASS} value={value} max={max} />
}
