// Parses the S3 location a template points at, such as s3://my-bucket/folder/, without zod, so the renderer can use it. See docs/UI.md.
import {
  BUCKET_NAME_PATTERN,
  IP_ADDRESS_PATTERN,
  S3_SCHEME
} from '../constants/s3-location-constants'
import type { S3Location } from '../types/s3-types'

function isBucketName(name: string): boolean {
  return BUCKET_NAME_PATTERN.test(name) && !name.includes('..') && !IP_ADDRESS_PATTERN.test(name)
}

export function parseS3Location(input: string): { location: S3Location } | { error: string } {
  let text = input.trim()
  if (text.toLowerCase().startsWith(S3_SCHEME)) text = text.slice(S3_SCHEME.length)
  if (text === '') return { error: 'Enter the bucket, for example s3://my-bucket/folder/.' }

  const slash = text.indexOf('/')
  const bucket = slash === -1 ? text : text.slice(0, slash)
  if (!isBucketName(bucket)) return { error: `"${bucket}" isn't a valid bucket name.` }

  const folders = (slash === -1 ? '' : text.slice(slash + 1)).split('/').filter(Boolean)
  return { location: { bucket, prefix: folders.length > 0 ? `${folders.join('/')}/` : '' } }
}
