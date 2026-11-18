// The IAM permissions each template type needs, shown on the Templates and How it works pages. See docs/ARCHITECTURE.md.
import type { TemplateKind } from '../../shared/ipc'

interface Permissions {
  summary: string
  // An example IAM policy, with BUCKET and FOLDER to replace.
  policy: string
}

const policy = (statements: object[]): string =>
  JSON.stringify({ Version: '2012-10-17', Statement: statements }, null, 2)

export const PERMISSIONS: Record<TemplateKind, Permissions> = {
  upload: {
    summary: 's3:PutObject on the folder, plus s3:AbortMultipartUpload for large files.',
    policy: policy([
      {
        Effect: 'Allow',
        Action: ['s3:PutObject', 's3:AbortMultipartUpload'],
        Resource: 'arn:aws:s3:::BUCKET/FOLDER/*'
      }
    ])
  },
  download: {
    summary:
      's3:ListBucket on the bucket, and s3:GetObject, s3:RestoreObject and s3:DeleteObject on its files.',
    policy: policy([
      { Effect: 'Allow', Action: 's3:ListBucket', Resource: 'arn:aws:s3:::BUCKET' },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:RestoreObject', 's3:DeleteObject'],
        Resource: 'arn:aws:s3:::BUCKET/*'
      }
    ])
  }
}
