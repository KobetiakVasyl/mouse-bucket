// The fixed settings every upload to a template uses, as the Upload page lists them. See docs/UI.md.
import { UPLOAD_CHECKSUM } from '../../../shared/constants/storage-constants'
import type { Template } from '../../../shared/types/template-types'
import { formatS3Location } from './s3-location-utils'

// Each setting's name and value.
export function uploadSettingsRows(template: Template): [string, string][] {
  return [
    ['Destination', formatS3Location(template)],
    ['Encryption', "The bucket's default encryption"],
    ['Checksum', UPLOAD_CHECKSUM],
    ['Versioning', "The bucket's own setting, which the app never changes"],
    ['Same file name', 'The file in the bucket is replaced']
  ]
}
