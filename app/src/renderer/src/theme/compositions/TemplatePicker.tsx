// Picks a template: the first 6 by name as large tiles with their platform and location, any others in a drop-down.
// See docs/UI.md.
import type { Template } from '../../../../shared/types/template-types'
import { templateLocation } from '../../utils/location-utils'
import { splitForPicker } from '../../utils/template-utils'
import { Section } from '../components/Section'
import { Select } from '../components/Select'
import { FOCUS } from '../styles/style-constants'
import { PlatformLabel } from './PlatformLabel'

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
    <Section title="Template">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4">
        {tiles.map((template) => {
          const selected = template.id === selectedId
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(template.id)}
              className={`rounded-xl border p-6 text-left ${selected ? 'border-ink bg-hover' : 'border-line bg-surface hover:border-muted hover:bg-hover'} ${FOCUS}`}
            >
              <span className="mb-1 block text-xl font-semibold">{template.name}</span>
              <span className="mb-1 block text-sm">
                <PlatformLabel platform={template.platform} />
              </span>
              <span className="block truncate text-sm text-muted">
                {templateLocation(template)}
              </span>
            </button>
          )
        })}
      </div>
      {more.length > 0 && (
        <Select
          label="More templates"
          className="mt-4"
          options={more.map((template) => ({
            value: template.id,
            label: template.name,
            detail: templateLocation(template)
          }))}
          value={chosenFromMore ? selectedId : null}
          placeholder="Choose another template…"
          onChange={onSelect}
        />
      )}
    </Section>
  )
}
