// The saved templates as cards, by name: each with its type, platform, location (and region on S3), Edit and a red
// Delete. The cards wrap into as many columns as fit. See docs/UI.md.
import type { Template } from '../../../../shared/types/template-types'
import { TEMPLATE_KIND_LABELS } from '../../constants/template-constants'
import { templateLocation } from '../../utils/location-utils'
import { sortByName } from '../../utils/template-utils'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { DeleteIcon, EditIcon } from '../components/icons'
import { PlatformLabel } from './PlatformLabel'

export function TemplateCards({
  templates,
  onEdit,
  onDelete
}: {
  templates: Template[]
  onEdit: (template: Template) => void
  onDelete: (template: Template) => void
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">
      {sortByName(templates).map((template) => (
        <Card
          key={template.id}
          title={template.name}
          headingLevel={3}
          description={`${TEMPLATE_KIND_LABELS[template.kind]} template`}
          actions={
            <>
              <Button className="text-sm" onClick={() => onEdit(template)}>
                <EditIcon />
                Edit
              </Button>
              <Button className="text-sm" variant="danger" onClick={() => onDelete(template)}>
                <DeleteIcon />
                Delete
              </Button>
            </>
          }
        >
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-muted">Platform</dt>
              <dd>
                <PlatformLabel platform={template.platform} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Location</dt>
              <dd className="break-all">{templateLocation(template)}</dd>
            </div>
            {template.platform === 's3' && (
              <div>
                <dt className="text-xs text-muted">Region</dt>
                <dd>{template.region}</dd>
              </div>
            )}
          </dl>
        </Card>
      ))}
    </div>
  )
}
