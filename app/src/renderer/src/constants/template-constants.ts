// How many templates the picker shows as tiles, the names of the template types, and the template form's choices and start. See docs/UI.md.
import type { TemplateKind } from '../../../shared/types/template-types'
import type { ChoiceOption } from '../types/component-types'
import type { KeySource, TemplateFormValues } from '../types/template-form-types'

export const PICKER_TILES = 6

// Shown on Home and Templates while there are no templates.
export const FIRST_TEMPLATE_MESSAGE = 'Add your first template to start uploading or downloading.'

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  upload: 'Upload',
  download: 'Download'
}

export const TEMPLATE_KIND_OPTIONS: ChoiceOption<TemplateKind>[] = [
  { value: 'upload', label: TEMPLATE_KIND_LABELS.upload },
  { value: 'download', label: TEMPLATE_KIND_LABELS.download }
]

export const KEY_SOURCE_OPTIONS: ChoiceOption<KeySource>[] = [
  { value: 'entered', label: 'Enter keys' },
  { value: 'copied', label: 'Copy from a template' }
]

export const EDIT_KEY_SOURCE_OPTIONS: ChoiceOption<KeySource>[] = [
  { value: 'kept', label: 'Keep the current keys' },
  { value: 'entered', label: 'Enter new keys' },
  { value: 'copied', label: 'Copy from a template' }
]

export const EMPTY_TEMPLATE_FORM: TemplateFormValues = {
  kind: 'upload',
  name: '',
  location: '',
  keySource: 'entered',
  accessKeyId: '',
  secretAccessKey: '',
  copyFrom: ''
}
