// A listed S3 object with the fields a file needs. See docs/ARCHITECTURE.md.
import type { _Object } from '@aws-sdk/client-s3'

export type ListedObject = _Object & { Key: string; Size: number; LastModified: Date }
