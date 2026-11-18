// Writes a template's location the way the page shows it on each platform: s3://my-bucket/folder/, the Azure container
// URL, or the Google Drive folder's name or link. See docs/UI.md.
import {
  AZURE_HOST_SUFFIX,
  DRIVE_FOLDER_URL,
  DRIVE_ROOT_ID,
  DRIVE_ROOT_NAME,
  S3_SCHEME
} from '../../../shared/constants/location-constants'
import type { StorageLocation } from '../../../shared/types/location-types'
import type { Template } from '../../../shared/types/template-types'

export function formatS3Location({ bucket, prefix }: { bucket: string; prefix: string }): string {
  return `${S3_SCHEME}${bucket}/${prefix}`
}

export function formatAzureLocation({
  account,
  container,
  prefix
}: {
  account: string
  container: string
  prefix: string
}): string {
  return `https://${account}${AZURE_HOST_SUFFIX}/${container}/${prefix}`
}

// A Drive folder's link, or My Drive for the root, which has none.
export function driveFolderInput(folderId: string): string {
  return folderId === DRIVE_ROOT_ID ? DRIVE_ROOT_NAME : `${DRIVE_FOLDER_URL}${folderId}`
}

// Where a template points, as the picker, the table and the upload settings show it. A Drive folder goes by its name.
export function templateLocation(template: Template): string {
  if (template.platform === 's3') return formatS3Location(template)
  if (template.platform === 'azure') return formatAzureLocation(template)
  return template.folderName
}

// The location as the template form takes it, to change it.
export function locationInput(template: Template): string {
  if (template.platform === 'google-drive') return driveFolderInput(template.folderId)
  return templateLocation(template)
}

// The top of what a download template browses: its bucket, its container, or its Drive folder.
export function rootLabel(template: Template): string {
  if (template.platform === 's3') return template.bucket
  if (template.platform === 'azure') return template.container
  return template.folderName
}

// A location being typed, for the form's hint. A Drive folder's name isn't known until main asks Google.
export function formatLocation(location: StorageLocation): string {
  if (location.platform === 's3') return formatS3Location(location)
  if (location.platform === 'azure') return formatAzureLocation(location)
  return location.folderId === DRIVE_ROOT_ID ? DRIVE_ROOT_NAME : 'the Drive folder in that link'
}

// The location of a folder Browse has open, as the template form takes it: '' is the template's top. On Google Drive,
// a folder's ID, and My Drive for the root, which has no link.
export function folderLocation(template: Template, folder: string): string {
  if (template.platform === 's3')
    return formatS3Location({ bucket: template.bucket, prefix: folder })
  if (template.platform === 'azure') {
    const { account, container } = template
    return formatAzureLocation({ account, container, prefix: folder })
  }
  return driveFolderInput(folder === '' ? template.folderId : folder)
}
