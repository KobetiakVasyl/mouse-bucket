// What a template's location looks like on each platform: s3://my-bucket/folder/, an Azure container URL, or a Google
// Drive folder link. See docs/UI.md.
export const S3_SCHEME = 's3://'
export const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
export const IP_ADDRESS_PATTERN = /^\d+\.\d+\.\d+\.\d+$/

// Azure's public cloud: https://<account>.blob.core.windows.net/<container>/<folder>/.
export const AZURE_HOST_SUFFIX = '.blob.core.windows.net'
export const AZURE_ACCOUNT_PATTERN = /^[a-z0-9]{3,24}$/
export const AZURE_CONTAINER_PATTERN = /^[a-z0-9](?!.*--)[a-z0-9-]{1,61}[a-z0-9]$/
export const HTTPS_PREFIX = /^https?:\/\//i

// Google Drive: a folder link, a bare folder ID, or the whole of My Drive.
export const DRIVE_ROOT_ID = 'root'
export const DRIVE_ROOT_NAME = 'My Drive'
export const DRIVE_FOLDER_LINK =
  /^(?:https?:\/\/)?drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)/i
export const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/'
export const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/

export const WHOLE_BUCKET_MESSAGE =
  'A download template points at a whole bucket. Remove the folder.'
export const WHOLE_CONTAINER_MESSAGE =
  'A download template points at a whole container. Remove the folder.'
