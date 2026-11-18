// The IAM permissions a template type needs, with an example policy. See docs/ARCHITECTURE.md.
export interface PolicyStatement {
  Effect: 'Allow'
  Action: string | string[]
  Resource: string
}

export interface Permissions {
  summary: string
  // The example policy's statements, with BUCKET and FOLDER to replace.
  statements: PolicyStatement[]
}
