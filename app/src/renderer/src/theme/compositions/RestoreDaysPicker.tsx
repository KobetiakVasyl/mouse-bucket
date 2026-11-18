// How many days a restored copy stays: a button for each of 1 to 7 days, and a box for any other number up to 365. Each
// change reports the days, or null while the box holds no valid number. See docs/UI.md.
import { useState } from 'react'
import { RESTORE_DAYS } from '../../../../shared/constants/storage-constants'
import { RESTORE_DAY_OPTIONS } from '../../constants/download-constants'
import { parseRestoreDays } from '../../validation/restore-validation'
import { ToggleGroup } from '../components/ToggleGroup'
import { FOCUS } from '../styles/style-constants'

export function RestoreDaysPicker({
  label,
  days,
  hint,
  onChange
}: {
  label: string
  days: number | null
  hint: string
  onChange: (days: number | null) => void
}): React.JSX.Element {
  // The box starts with the days only when no button has them.
  const [other, setOther] = useState(() =>
    days !== null && !RESTORE_DAY_OPTIONS.some((option) => option.value === String(days))
      ? String(days)
      : ''
  )
  const invalid = other !== '' && parseRestoreDays(other) === null
  return (
    <ToggleGroup
      label={label}
      options={RESTORE_DAY_OPTIONS}
      value={days === null ? null : String(days)}
      hint={hint}
      onChange={(value) => {
        setOther('')
        onChange(Number(value))
      }}
    >
      <label className="flex items-center gap-2">
        <span className="text-muted">Other</span>
        <input
          aria-label="Other number of days"
          aria-invalid={invalid}
          className={`w-24 rounded-lg border bg-surface px-3 py-2 text-ink ${invalid ? 'border-danger' : 'border-line hover:border-muted focus:border-ink'} ${FOCUS}`}
          type="number"
          min={RESTORE_DAYS.min}
          max={RESTORE_DAYS.max}
          value={other}
          onChange={(event) => {
            setOther(event.target.value)
            onChange(parseRestoreDays(event.target.value))
          }}
        />
      </label>
    </ToggleGroup>
  )
}
