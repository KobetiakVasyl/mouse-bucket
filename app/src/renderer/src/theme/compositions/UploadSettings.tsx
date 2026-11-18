// The settings of the next upload: S3's storage class or Azure's access tier, the fixed ones, and, on S3, tags and
// metadata shown as coming soon. Google Drive has no class to choose. See docs/UI.md.
import type { AccessTier, UploadStorageClass } from '../../../../shared/types/storage-types'
import type { Template } from '../../../../shared/types/template-types'
import {
  ACCESS_TIER_HINTS,
  ACCESS_TIER_OPTIONS,
  UPLOAD_STORAGE_CLASS_HINTS,
  UPLOAD_STORAGE_CLASS_OPTIONS
} from '../../constants/storage-class-constants'
import { uploadSettingsRows } from '../../utils/upload-utils'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Select } from '../components/Select'
import { INPUT_CLASS } from '../styles/style-constants'

export function UploadSettings({
  template,
  storageClass,
  accessTier,
  onStorageClassChange,
  onAccessTierChange
}: {
  template: Template
  storageClass: UploadStorageClass
  accessTier: AccessTier
  onStorageClassChange: (storageClass: UploadStorageClass) => void
  onAccessTierChange: (accessTier: AccessTier) => void
}): React.JSX.Element {
  return (
    <Card title="Upload settings" className="mt-10">
      {template.platform === 's3' && (
        <Select
          label="Storage class"
          className="mb-6"
          options={UPLOAD_STORAGE_CLASS_OPTIONS}
          value={storageClass}
          hint={UPLOAD_STORAGE_CLASS_HINTS[storageClass]}
          onChange={onStorageClassChange}
        />
      )}
      {template.platform === 'azure' && (
        <Select
          label="Access tier"
          className="mb-6"
          options={ACCESS_TIER_OPTIONS}
          value={accessTier}
          hint={ACCESS_TIER_HINTS[accessTier]}
          onChange={onAccessTierChange}
        />
      )}
      <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2">
        {uploadSettingsRows(template).map(([name, value]) => (
          <div key={name} className="contents">
            <dt className="text-muted">{name}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {template.platform === 's3' && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label={
              <>
                Tags <Badge label="Soon" />
              </>
            }
          >
            <input className={INPUT_CLASS} placeholder="project=reports" disabled />
          </Field>
          <Field
            label={
              <>
                Metadata <Badge label="Soon" />
              </>
            }
          >
            <input className={INPUT_CLASS} placeholder="x-amz-meta-owner=me" disabled />
          </Field>
        </div>
      )}
    </Card>
  )
}
