// The saved templates by name, each with its type, platform, location, Edit and a red Delete. See docs/UI.md.
import type { Template } from '../../../../shared/types/template-types'
import { TEMPLATE_KIND_LABELS } from '../../constants/template-constants'
import { templateLocation } from '../../utils/location-utils'
import { sortByName } from '../../utils/template-utils'
import { Button } from '../components/Button'
import { TableFrame } from '../components/TableFrame'
import { CELL, TABLE_HEAD_ROW, TABLE_ROW } from '../styles/style-constants'
import { DeleteIcon, EditIcon } from '../components/icons'
import { PlatformLabel } from './PlatformLabel'

export function TemplateTable({
  templates,
  onEdit,
  onDelete
}: {
  templates: Template[]
  onEdit: (template: Template) => void
  onDelete: (template: Template) => void
}): React.JSX.Element {
  return (
    <TableFrame>
      <thead>
        <tr className={TABLE_HEAD_ROW}>
          <th className={CELL}>Name</th>
          <th className={CELL}>Type</th>
          <th className={CELL}>Platform</th>
          <th className={CELL}>Location</th>
          <th className={CELL} />
        </tr>
      </thead>
      <tbody>
        {sortByName(templates).map((template) => (
          <tr key={template.id} className={TABLE_ROW}>
            <td className={CELL}>{template.name}</td>
            <td className={CELL}>{TEMPLATE_KIND_LABELS[template.kind]}</td>
            <td className={CELL}>
              <PlatformLabel platform={template.platform} />
            </td>
            <td className={`${CELL} break-all`}>
              {templateLocation(template)}
              {template.platform === 's3' && (
                <span className="block text-sm text-muted">{template.region}</span>
              )}
            </td>
            <td className={CELL}>
              <div className="flex flex-wrap justify-end gap-2">
                <Button className="text-sm" onClick={() => onEdit(template)}>
                  <EditIcon />
                  Edit
                </Button>
                <Button className="text-sm" variant="danger" onClick={() => onDelete(template)}>
                  <DeleteIcon />
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </TableFrame>
  )
}
