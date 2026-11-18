// The settings of the next upload: its storage class, the fixed ones, and tags and metadata shown as coming soon. See
// docs/UI.md.
import type { UploadStorageClass } from '../../../../shared/types/s3-types'
import type { Template } from '../../../../shared/types/template-types'
import {
  UPLOAD_STORAGE_CLASS_HINTS,
  UPLOAD_STORAGE_CLASS_OPTIONS
} from '../../constants/storage-class-constants'
import { uploadSettingsRows } from '../../utils/upload-utils'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { SoonBadge } from '../components/SoonBadge'
import { Select } from '../components/Select'
import { INPUT_CLASS } from '../styles/style-constants'

export function UploadSettings({
  template,
  storageClass,
  onStorageClassChange
}: {
  template: Template
  storageClass: UploadStorageClass
  onStorageClassChange: (storageClass: UploadStorageClass) => void
}): React.JSX.Element {
  return (
    <Card title="Upload settings" className="mt-10">
      <Select
        label="Storage class"
        className="mb-6"
        options={UPLOAD_STORAGE_CLASS_OPTIONS}
        value={storageClass}
        hint={UPLOAD_STORAGE_CLASS_HINTS[storageClass]}
        onChange={onStorageClassChange}
      />
      <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2">
        {uploadSettingsRows(template).map(([name, value]) => (
          <div key={name} className="contents">
            <dt className="text-muted">{name}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field
          label={
            <>
              Tags <SoonBadge />
            </>
          }
        >
          <input className={INPUT_CLASS} placeholder="project=reports" disabled />
        </Field>
        <Field
          label={
            <>
              Metadata <SoonBadge />
            </>
          }
        >
          <input className={INPUT_CLASS} placeholder="x-amz-meta-owner=me" disabled />
        </Field>
      </div>
    </Card>
  )
}
