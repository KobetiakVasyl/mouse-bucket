// What a template's S3 location looks like, such as s3://my-bucket/folder/, and that a download template takes a whole bucket. See docs/UI.md.
export const S3_SCHEME = 's3://'
export const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
export const IP_ADDRESS_PATTERN = /^\d+\.\d+\.\d+\.\d+$/

export const WHOLE_BUCKET_MESSAGE =
  'A download template points at a whole bucket. Remove the folder.'
