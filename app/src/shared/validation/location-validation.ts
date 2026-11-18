// Parses the location a template points at on each platform, without zod, so the renderer can use it too. See
// docs/UI.md.
import {
  AZURE_ACCOUNT_PATTERN,
  AZURE_CONTAINER_PATTERN,
  AZURE_HOST_SUFFIX,
  BUCKET_NAME_PATTERN,
  DRIVE_FOLDER_LINK,
  DRIVE_ID_PATTERN,
  DRIVE_ROOT_ID,
  DRIVE_ROOT_NAME,
  HTTPS_PREFIX,
  IP_ADDRESS_PATTERN,
  S3_SCHEME,
  WHOLE_BUCKET_MESSAGE,
  WHOLE_CONTAINER_MESSAGE
} from '../constants/location-constants'
import type {
  AzureLocation,
  DriveLocation,
  LocationResult,
  S3Location,
  StorageLocation
} from '../types/location-types'
import type { Platform, TemplateKind } from '../types/template-types'

function isBucketName(name: string): boolean {
  return BUCKET_NAME_PATTERN.test(name) && !name.includes('..') && !IP_ADDRESS_PATTERN.test(name)
}

// The folders after the bucket or container, as a prefix ending with "/", or '' for none.
function prefixOf(folders: string[]): string {
  return folders.length > 0 ? `${folders.join('/')}/` : ''
}

export function parseS3Location(input: string): LocationResult<S3Location> {
  let text = input.trim()
  if (text.toLowerCase().startsWith(S3_SCHEME)) text = text.slice(S3_SCHEME.length)
  if (text === '') return { error: 'Enter the bucket, for example s3://my-bucket/folder/.' }

  const slash = text.indexOf('/')
  const bucket = slash === -1 ? text : text.slice(0, slash)
  if (!isBucketName(bucket)) return { error: `"${bucket}" isn't a valid bucket name.` }

  const folders = (slash === -1 ? '' : text.slice(slash + 1)).split('/').filter(Boolean)
  return { location: { platform: 's3', bucket, prefix: prefixOf(folders) } }
}

export function parseAzureLocation(input: string): LocationResult<AzureLocation> {
  const text = input.trim().replace(HTTPS_PREFIX, '')
  const parts = text.split('/')
  const host = parts[0].toLowerCase()
  if (!host.endsWith(AZURE_HOST_SUFFIX)) {
    return {
      error:
        'Enter the container URL, for example https://myaccount.blob.core.windows.net/backups/.'
    }
  }
  const account = host.slice(0, -AZURE_HOST_SUFFIX.length)
  if (!AZURE_ACCOUNT_PATTERN.test(account)) {
    return { error: `"${account}" isn't a valid storage account name.` }
  }
  const [container, ...folders] = parts.slice(1).filter(Boolean)
  if (container === undefined) {
    return { error: `Add the container after the account, such as ${host}/backups/.` }
  }
  if (!AZURE_CONTAINER_PATTERN.test(container)) {
    return { error: `"${container}" isn't a valid container name.` }
  }
  return { location: { platform: 'azure', account, container, prefix: prefixOf(folders) } }
}

export function parseDriveLocation(input: string): LocationResult<DriveLocation> {
  const text = input.trim()
  if (text.toLowerCase() === DRIVE_ROOT_NAME.toLowerCase()) {
    return { location: { platform: 'google-drive', folderId: DRIVE_ROOT_ID } }
  }
  const link = DRIVE_FOLDER_LINK.exec(text)
  if (link !== null) return { location: { platform: 'google-drive', folderId: link[1] } }
  if (DRIVE_ID_PATTERN.test(text)) return { location: { platform: 'google-drive', folderId: text } }
  return {
    error: `Enter a folder's link from Google Drive, such as https://drive.google.com/drive/folders/…, or ${DRIVE_ROOT_NAME}.`
  }
}

export function parseLocation(platform: Platform, input: string): LocationResult<StorageLocation> {
  if (platform === 's3') return parseS3Location(input)
  if (platform === 'azure') return parseAzureLocation(input)
  return parseDriveLocation(input)
}

// Why a location doesn't suit the template's type, or null when it does: a download template browses a whole bucket or
// container. On Google Drive, any folder will do.
export function kindProblem(location: StorageLocation, kind: TemplateKind): string | null {
  if (kind !== 'download' || location.platform === 'google-drive' || location.prefix === '') {
    return null
  }
  return location.platform === 's3' ? WHOLE_BUCKET_MESSAGE : WHOLE_CONTAINER_MESSAGE
}
