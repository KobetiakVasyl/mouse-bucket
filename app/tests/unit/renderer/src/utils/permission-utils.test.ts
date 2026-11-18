import { describe, expect, it } from 'vitest'
import { PERMISSIONS } from '../../../../../src/renderer/src/constants/permission-constants'
import { policyJson } from '../../../../../src/renderer/src/utils/permission-utils'

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
