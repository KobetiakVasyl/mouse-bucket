// Names S3's storage classes the way the S3 console does. See docs/UI.md.
import { STORAGE_CLASS_LABELS } from '../constants/storage-class-constants'

// S3's own name for a class without a readable one.
export function storageClassLabel(storageClass: string): string {
  const label = STORAGE_CLASS_LABELS.get(storageClass)
  return label === undefined ? storageClass : label
}
