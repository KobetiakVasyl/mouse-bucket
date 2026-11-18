// A template's IAM keys, and everything S3 calls need to reach its bucket. They never leave main. See docs/SECURITY.md.
import type { z } from 'zod'
import type { CredentialsFileSchema } from '../validation/data-file-validation'

export interface Credentials {
  accessKeyId: string
  secretAccessKey: string
}

// The decrypted contents of credentials.bin: each template's keys by its ID.
export type CredentialsFile = z.infer<typeof CredentialsFileSchema>

export interface BucketAccess {
  bucket: string
  region: string
  credentials: Credentials
}
