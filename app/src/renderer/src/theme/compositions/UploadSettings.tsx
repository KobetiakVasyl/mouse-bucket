// The settings of the next upload: S3's storage class or Azure's access tier, then the fixed ones as tags, each a small
// name above its value. Google Drive has no class to choose. See docs/UI.md.
import type { AccessTier, UploadStorageClass } from '../../../../shared/types/storage-types'
import type { Template } from '../../../../shared/types/template-types'
import {
  ACCESS_TIER_HINTS,
  ACCESS_TIER_OPTIONS,
  UPLOAD_STORAGE_CLASS_HINTS,
  UPLOAD_STORAGE_CLASS_OPTIONS
} from '../../constants/storage-class-constants'
import { uploadSettingsRows } from '../../utils/upload-utils'
import { Card } from '../components/Card'
import { Select } from '../components/Select'

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
      <dl className="flex flex-wrap gap-3">
        {uploadSettingsRows(template).map(([name, value]) => (
          <div key={name} className="min-w-0 max-w-full rounded-lg border border-line px-3 py-2">
            <dt className="text-xs text-muted">{name}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
