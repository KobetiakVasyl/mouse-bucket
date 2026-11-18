// The saved templates by name, each with its type, location, region, Edit and a red Delete. See docs/UI.md.
import type { Template } from '../../../../shared/types/template-types'
import { formatS3Location } from '../../utils/s3-location-utils'
import { TEMPLATE_KIND_LABELS } from '../../constants/template-constants'
import { sortByName } from '../../utils/template-utils'
import { Button } from '../components/Button'
import { TableFrame } from '../components/TableFrame'
import { CELL, TABLE_HEAD_ROW, TABLE_ROW } from '../styles/style-constants'

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
          <th className={CELL}>Location</th>
          <th className={CELL}>Region</th>
          <th className={CELL} />
        </tr>
      </thead>
      <tbody>
        {sortByName(templates).map((template) => (
          <tr key={template.id} className={TABLE_ROW}>
            <td className={CELL}>{template.name}</td>
            <td className={CELL}>{TEMPLATE_KIND_LABELS[template.kind]}</td>
            <td className={`${CELL} break-all`}>{formatS3Location(template)}</td>
            <td className={CELL}>{template.region}</td>
            <td className={CELL}>
              <div className="flex justify-end gap-2">
                <Button className="text-sm" onClick={() => onEdit(template)}>
                  Edit
                </Button>
                <Button className="text-sm" variant="danger" onClick={() => onDelete(template)}>
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
