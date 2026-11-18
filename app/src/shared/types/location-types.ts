// Where a template points on its platform, as parsed from what was typed in, before main checks it. See
// docs/ARCHITECTURE.md.
export interface S3Location {
  platform: 's3'
  bucket: string
  // Empty for the whole bucket, otherwise the folder's key prefix, ending with "/".
  prefix: string
}

export interface AzureLocation {
  platform: 'azure'
  account: string
  container: string
  // Empty for the whole container, otherwise the folder's name prefix, ending with "/".
  prefix: string
}

export interface DriveLocation {
  platform: 'google-drive'
  // A folder's ID, or "root" for My Drive.
  folderId: string
}

export type StorageLocation = S3Location | AzureLocation | DriveLocation

export type LocationResult<L> = { location: L } | { error: string }
