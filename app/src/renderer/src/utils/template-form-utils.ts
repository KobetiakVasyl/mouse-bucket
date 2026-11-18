// Explains the template form's S3 location as it's typed, and turns the form into what main receives. See docs/UI.md.
import type { NewTemplate, Template, TemplateEdit } from '../../../shared/types/template-types'
import { formatS3Location } from './s3-location-utils'
import { parseS3Location } from '../../../shared/validation/s3-location-validation'
import { WHOLE_BUCKET_MESSAGE } from '../../../shared/constants/s3-location-constants'
import type { TemplateFormValues } from '../types/template-form-types'
import { selectedTemplate } from './template-utils'

export function locationHint(form: TemplateFormValues): string {
  if (form.location.trim() === '') {
    return form.kind === 'upload'
      ? 'For example s3://my-bucket/folder/'
      : 'For example s3://my-bucket'
  }
  const parsed = parseS3Location(form.location)
  if ('error' in parsed) return parsed.error
  if (form.kind === 'download' && parsed.location.prefix !== '') return WHOLE_BUCKET_MESSAGE
  const where = formatS3Location(parsed.location)
  return form.kind === 'upload' ? `Uploads go to ${where}` : `Downloads browse ${where}`
}

// Copying needs a template to copy from, so with none saved the keys are always typed in.
export function isCopyingKeys(form: TemplateFormValues, templates: Template[]): boolean {
  return templates.length > 0 && form.keySource === 'copied'
}

export function newTemplate(form: TemplateFormValues, templates: Template[]): NewTemplate {
  const base = { kind: form.kind, name: form.name, location: form.location }
  if (!isCopyingKeys(form, templates)) return { ...base, keys: enteredKeys(form) }
  return {
    ...base,
    keys: { source: 'copied', templateId: selectedTemplate(templates, form.copyFrom).id }
  }
}

function enteredKeys(form: TemplateFormValues): NewTemplate['keys'] {
  return {
    source: 'entered',
    accessKeyId: form.accessKeyId,
    secretAccessKey: form.secretAccessKey
  }
}

// The form filled in with a template to change, keeping its keys.
export function formFor(template: Template): TemplateFormValues {
  return {
    kind: template.kind,
    name: template.name,
    location: formatS3Location(template),
    keySource: 'kept',
    accessKeyId: '',
    secretAccessKey: '',
    copyFrom: ''
  }
}

// `templates` are the ones whose keys may be copied: all but the one being changed.
export function templateEdit(
  form: TemplateFormValues,
  id: string,
  templates: Template[]
): TemplateEdit {
  if (form.keySource !== 'kept') return { id, ...newTemplate(form, templates) }
  return { id, kind: form.kind, name: form.name, location: form.location, keys: { source: 'kept' } }
}
