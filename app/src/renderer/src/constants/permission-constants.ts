// The IAM permissions each template type needs, and the IAM user the CloudShell script makes, shown on the Templates
// and How it works pages. See docs/ARCHITECTURE.md.
import type { TemplateKind } from '../../../shared/types/template-types'
import type { Permissions, PolicyStatement } from '../types/permission-types'

export const POLICY_VERSION = '2012-10-17'

export const PERMISSIONS: Record<TemplateKind, Permissions> = {
  upload: {
    summary: 's3:PutObject on the folder, plus s3:AbortMultipartUpload for large files.',
    statements: [
      {
        Effect: 'Allow',
        Action: ['s3:PutObject', 's3:AbortMultipartUpload'],
        Resource: 'arn:aws:s3:::BUCKET/FOLDER/*'
      }
    ]
  },
  download: {
    summary:
      's3:ListBucket on the bucket, and s3:GetObject, s3:RestoreObject and s3:DeleteObject on its files.',
    statements: [
      { Effect: 'Allow', Action: 's3:ListBucket', Resource: 'arn:aws:s3:::BUCKET' },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:RestoreObject', 's3:DeleteObject'],
        Resource: 'arn:aws:s3:::BUCKET/*'
      }
    ]
  }
}

// The IAM user the CloudShell script makes, and the name of its policy.
export const IAM_USER_NAME = 'mousebucket'
export const IAM_POLICY_NAME = 'MouseBucketS3'

// Reading and writing every bucket in the account: each S3 action the app uses, on every bucket.
export const ALL_BUCKETS_STATEMENTS: PolicyStatement[] = [
  { Effect: 'Allow', Action: 's3:ListBucket', Resource: 'arn:aws:s3:::*' },
  {
    Effect: 'Allow',
    Action: [
      's3:GetObject',
      's3:PutObject',
      's3:DeleteObject',
      's3:RestoreObject',
      's3:AbortMultipartUpload'
    ],
    Resource: 'arn:aws:s3:::*/*'
  }
]
