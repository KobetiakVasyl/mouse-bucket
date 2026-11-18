// What the form that adds a template holds while it's filled in. See docs/UI.md.
import type { TemplateKind } from '../../../shared/types/template-types'

export type KeySource = 'entered' | 'copied'

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
