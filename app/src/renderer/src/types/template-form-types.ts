// What the form that adds or changes a template holds while it's filled in. See docs/UI.md.
import type { TemplateKind } from '../../../shared/types/template-types'

// Kept is only for a template being changed: it keeps the keys it has.
export type KeySource = 'entered' | 'copied' | 'kept'

export interface TemplateFormValues {
  kind: TemplateKind
  name: string
  location: string
  keySource: KeySource
  accessKeyId: string
  secretAccessKey: string
  // The template whose keys a copy uses.
  copyFrom: string
}

// The form's text inputs.
export type TemplateFormTextField = 'name' | 'location' | 'accessKeyId' | 'secretAccessKey'
