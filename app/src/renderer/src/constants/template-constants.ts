// How many templates the picker shows as tiles, the names of the template types, and the new-template form's start. See docs/UI.md.
import type { TemplateKind } from '../../../shared/types/template-types'
import type { ToggleOption } from '../types/component-types'
import type { KeySource, TemplateFormValues } from '../types/template-form-types'

export const PICKER_TILES = 10

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  upload: 'Upload',
  download: 'Download'
}

export const TEMPLATE_KIND_OPTIONS: ToggleOption<TemplateKind>[] = [
  { value: 'upload', label: TEMPLATE_KIND_LABELS.upload },
  { value: 'download', label: TEMPLATE_KIND_LABELS.download }
]

export const KEY_SOURCE_OPTIONS: ToggleOption<KeySource>[] = [
  { value: 'entered', label: 'Enter keys' },
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
