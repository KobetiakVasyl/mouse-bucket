// Writes an example IAM policy as the JSON the AWS console accepts. See docs/ARCHITECTURE.md.
import { POLICY_VERSION } from '../constants/permission-constants'
import type { PolicyStatement } from '../types/permission-types'

export function policyJson(statements: PolicyStatement[]): string {
  return JSON.stringify({ Version: POLICY_VERSION, Statement: statements }, null, 2)
}
