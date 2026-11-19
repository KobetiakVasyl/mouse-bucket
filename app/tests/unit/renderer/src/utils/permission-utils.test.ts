import { describe, expect, it } from 'vitest'
import {
  ALL_BUCKETS_STATEMENTS,
  PERMISSIONS
} from '../../../../../src/renderer/src/constants/permission-constants'
import {
  cloudShellScript,
  policyJson
} from '../../../../../src/renderer/src/utils/permission-utils'

describe('policyJson', () => {
  it('writes a policy the AWS console accepts, with every action a template type needs', () => {
    const upload: unknown = JSON.parse(policyJson(PERMISSIONS.upload.statements))
    expect(upload).toEqual({ Version: '2012-10-17', Statement: PERMISSIONS.upload.statements })
    const download = policyJson(PERMISSIONS.download.statements)
    for (const action of ['s3:ListBucket', 's3:GetObject', 's3:RestoreObject', 's3:DeleteObject']) {
      expect(download).toContain(`"${action}"`)
    }
  })
})

describe('cloudShellScript', () => {
  it('makes the IAM user once, lets it read and write every bucket, and prints a new key', () => {
    const lines = cloudShellScript().split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(
      'aws iam get-user --user-name mousebucket > /dev/null 2>&1 || aws iam create-user --user-name mousebucket > /dev/null'
    )
    const policy = /--policy-document '([^']*)'$/.exec(lines[1])
    expect(policy).not.toBeNull()
    expect(JSON.parse(policy?.[1] ?? '')).toEqual({
      Version: '2012-10-17',
      Statement: ALL_BUCKETS_STATEMENTS
    })
    expect(lines[2]).toContain('aws iam create-access-key --user-name mousebucket')
  })

  it('allows each S3 action the app uses, on every bucket, and nothing outside S3', () => {
    const actions = ALL_BUCKETS_STATEMENTS.flatMap((statement) => statement.Action)
    expect(actions.sort()).toEqual(
      [
        's3:AbortMultipartUpload',
        's3:DeleteObject',
        's3:GetObject',
        's3:ListBucket',
        's3:PutObject',
        's3:RestoreObject'
      ].sort()
    )
    expect(ALL_BUCKETS_STATEMENTS.map((statement) => statement.Resource)).toEqual([
      'arn:aws:s3:::*',
      'arn:aws:s3:::*/*'
    ])
  })
})
