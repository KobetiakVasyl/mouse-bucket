// Writes a template's S3 location the way the page shows it, such as s3://my-bucket/folder/. See docs/UI.md.
import { S3_SCHEME } from '../../../shared/constants/s3-location-constants'
import type { S3Location } from '../../../shared/types/s3-types'

export function formatS3Location({ bucket, prefix }: S3Location): string {
  return `${S3_SCHEME}${bucket}/${prefix}`
}
