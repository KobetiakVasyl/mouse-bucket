// The fixed settings every upload to a template uses on its platform, as the Upload page lists them. See docs/UI.md.
import { UPLOAD_CHECKSUM } from '../../../shared/constants/storage-constants'
import type { Template } from '../../../shared/types/template-types'
import { formatAzureLocation, formatS3Location } from './location-utils'

// Each setting's name and value.
export function uploadSettingsRows(template: Template): [string, string][] {
  if (template.platform === 's3') {
    return [
      ['Destination', formatS3Location(template)],
      ['Encryption', "The bucket's default encryption"],
      ['Checksum', UPLOAD_CHECKSUM],
      ['Versioning', "The bucket's own setting, which the app never changes"],
      ['Same file name', 'The file in the bucket is replaced'],
      ['Tags', 'None'],
      ['Metadata', 'None']
    ]
  }
  if (template.platform === 'azure') {
    return [
      ['Destination', formatAzureLocation(template)],
      ['Encryption', "Azure Storage's encryption, which is always on"],
      ['Checksum', 'MD5, for each block'],
      ['Versioning', "The storage account's own setting, which the app never changes"],
      ['Same file name', 'The blob in the container is replaced']
    ]
  }
  return [
    ['Destination', `Google Drive: ${template.folderName}`],
    ['Encryption', "Google Drive's own"],
    ['Checksum', 'MD5 of the whole file, compared once it arrives'],
    ['Same file name', 'Google Drive keeps both files']
  ]
}

export function queuedMessage(queued: number): string {
  return `${queued} ${queued === 1 ? 'file' : 'files'} added to the transfers.`
}
