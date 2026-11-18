// A template's keys on each platform, and everything a platform's calls need to reach its location. They never leave
// main. See docs/SECURITY.md.
import type { z } from 'zod'
import type {
  AzureCredentialsSchema,
  CredentialsFileSchema,
  CredentialsSchema,
  DriveCredentialsSchema,
  S3CredentialsSchema,
  TransferPlaceSchema
} from '../validation/data-file-validation'

export type S3Credentials = z.infer<typeof S3CredentialsSchema>
export type AzureCredentials = z.infer<typeof AzureCredentialsSchema>
// The user's own OAuth client, and the refresh token Google gave when they signed in.
export type DriveCredentials = z.infer<typeof DriveCredentialsSchema>
export type Credentials = z.infer<typeof CredentialsSchema>

// The decrypted contents of credentials.bin: each template's keys by its ID.
export type CredentialsFile = z.infer<typeof CredentialsFileSchema>

// Where a template points, without its folder: what a transfer keeps so it can resume.
export type TransferPlace = z.infer<typeof TransferPlaceSchema>

export type S3Access = Extract<TransferPlace, { platform: 's3' }> & { credentials: S3Credentials }
export type AzureAccess = Extract<TransferPlace, { platform: 'azure' }> & {
  credentials: AzureCredentials
}
export type DriveAccess = Extract<TransferPlace, { platform: 'google-drive' }> & {
  credentials: DriveCredentials
}
export type StorageAccess = S3Access | AzureAccess | DriveAccess
