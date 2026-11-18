// Picks a template: the first 10 by name as tiles, any others in a drop-down. See docs/UI.md.
import type { Template } from '../../../../shared/types/template-types'
import { formatS3Location } from '../../utils/s3-location-utils'
import { splitForPicker } from '../../utils/template-utils'
import { FOCUS, INPUT_CLASS } from '../styles/style-constants'

export function TemplatePicker({
  templates,
  selectedId,
  onSelect
}: {
  templates: Template[]
  selectedId: string
  onSelect: (id: string) => void
}): React.JSX.Element {
  const { tiles, more } = splitForPicker(templates)
  const chosenFromMore = more.some((template) => template.id === selectedId)
  return (
    <section aria-label="Template">
      <h2 className="mb-3 text-xl font-semibold">Template</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
        {tiles.map((template) => {
          const selected = template.id === selectedId
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(template.id)}
              className={`rounded-xl border p-4 text-left ${selected ? 'border-ink bg-hover' : 'border-line bg-surface hover:border-muted hover:bg-hover'} ${FOCUS}`}
            >
              <span className="block font-semibold">{template.name}</span>
              <span className="block truncate text-sm text-muted">
                {formatS3Location(template)}
              </span>
            </button>
          )
        })}
      </div>
      {more.length > 0 && (
        <label className="mt-3 block max-w-md">
          <span className="mb-1 block text-sm text-muted">More templates</span>
          <select
            className={INPUT_CLASS}
            value={chosenFromMore ? selectedId : ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="" disabled>
              Choose another template…
            </option>
            {more.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  )
}
