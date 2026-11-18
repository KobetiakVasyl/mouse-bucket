// What the form that adds or changes a template holds while it's filled in. See docs/UI.md.
import type { Platform, TemplateKind } from '../../../shared/types/template-types'

// Kept is only for a template being changed on the same platform: it keeps the keys it has.
export type KeySource = 'entered' | 'copied' | 'kept'

export interface TemplateFormValues {
  platform: Platform
  kind: TemplateKind
  name: string
  location: string
  keySource: KeySource
  // S3's keys.
  accessKeyId: string
  secretAccessKey: string
  // Azure's storage account key.
  accountKey: string
  // Google's OAuth client, which signs in through the browser.
  clientId: string
  clientSecret: string
  // The template whose keys a copy uses.
  copyFrom: string
}

// The form's text inputs.
export type TemplateFormTextField =
  | 'name'
  | 'location'
  | 'accessKeyId'
  | 'secretAccessKey'
  | 'accountKey'
  | 'clientId'
  | 'clientSecret'
