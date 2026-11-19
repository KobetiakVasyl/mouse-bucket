// Writes an example IAM policy as the JSON the AWS console accepts, and the CloudShell script that makes an IAM user.
// See docs/ARCHITECTURE.md.
import {
  ALL_BUCKETS_STATEMENTS,
  IAM_POLICY_NAME,
  IAM_USER_NAME,
  POLICY_VERSION
} from '../constants/permission-constants'
import type { PolicyStatement } from '../types/permission-types'

export function policyJson(statements: PolicyStatement[]): string {
  return JSON.stringify({ Version: POLICY_VERSION, Statement: statements }, null, 2)
}

// Makes the IAM user unless it exists, gives it read and write on every bucket, and prints a new access key. The policy
// is on one line in single quotes, which JSON never contains, so the shell passes it unchanged.
export function cloudShellScript(): string {
  const policy = JSON.stringify({ Version: POLICY_VERSION, Statement: ALL_BUCKETS_STATEMENTS })
  const user = `--user-name ${IAM_USER_NAME}`
  return [
    `aws iam get-user ${user} > /dev/null 2>&1 || aws iam create-user ${user} > /dev/null`,
    `aws iam put-user-policy ${user} --policy-name ${IAM_POLICY_NAME} --policy-document '${policy}'`,
    `aws iam create-access-key ${user} --query 'AccessKey.{AccessKeyId:AccessKeyId,SecretAccessKey:SecretAccessKey}' --output table`
  ].join('\n')
}
