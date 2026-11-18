// Parses the S3 location a template points at, such as s3://my-bucket/folder/. See docs/UI.md.
export interface S3Location {
  bucket: string
  // Empty for the whole bucket, otherwise the folder's key prefix, ending with "/".
  prefix: string
}

const BUCKET_NAME = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
const IP_ADDRESS = /^\d+\.\d+\.\d+\.\d+$/

function isBucketName(name: string): boolean {
  return BUCKET_NAME.test(name) && !name.includes('..') && !IP_ADDRESS.test(name)
}

export function parseS3Location(input: string): { location: S3Location } | { error: string } {
  let text = input.trim()
  if (/^s3:\/\//i.test(text)) text = text.slice('s3://'.length)
  if (text === '') return { error: 'Enter the bucket, for example s3://my-bucket/folder/.' }

  const slash = text.indexOf('/')
  const bucket = slash === -1 ? text : text.slice(0, slash)
  if (!isBucketName(bucket)) return { error: `"${bucket}" isn't a valid bucket name.` }

  const folders = (slash === -1 ? '' : text.slice(slash + 1)).split('/').filter(Boolean)
  return { location: { bucket, prefix: folders.length > 0 ? `${folders.join('/')}/` : '' } }
}

export function formatS3Location({ bucket, prefix }: S3Location): string {
  return `s3://${bucket}/${prefix}`
}
