// Explains the template form's location as it's typed, and turns the form into what main receives. See docs/UI.md.
import type {
  EnteredSecrets,
  NewTemplate,
  Template,
  TemplateEdit
} from '../../../shared/types/template-types'
import { kindProblem, parseLocation } from '../../../shared/validation/location-validation'
import { PERMISSIONS } from '../constants/permission-constants'
import { ACCESS_HINTS, LOCATION_EXAMPLES } from '../constants/platform-constants'
import type { TemplateFormValues } from '../types/template-form-types'
import { formatLocation, locationInput } from './location-utils'
import { selectedTemplate } from './template-utils'

export function locationHint(form: TemplateFormValues): string {
  if (form.location.trim() === '') return LOCATION_EXAMPLES[form.platform][form.kind]
  const parsed = parseLocation(form.platform, form.location)
  if ('error' in parsed) return parsed.error
  const problem = kindProblem(parsed.location, form.kind)
  if (problem !== null) return problem
  const where = formatLocation(parsed.location)
  return form.kind === 'upload' ? `Uploads go to ${where}` : `Downloads browse ${where}`
}

// The templates whose keys the form may copy: those on the same platform, apart from the one being changed.
export function copySourcesFor(
  form: TemplateFormValues,
  templates: Template[],
  editingId: string | null
): Template[] {
  return templates.filter(
    (template) => template.platform === form.platform && template.id !== editingId
  )
}

// Copying needs a template to copy from, so with none on the platform the keys are always typed in.
export function isCopyingKeys(form: TemplateFormValues, templates: Template[]): boolean {
  return templates.length > 0 && form.keySource === 'copied'
}

// Whether saving the form signs in to Google, which waits for the browser.
export function signsIn(form: TemplateFormValues, templates: Template[]): boolean {
  return (
    form.platform === 'google-drive' &&
    form.keySource === 'entered' &&
    !isCopyingKeys(form, templates)
  )
}

function enteredSecrets(form: TemplateFormValues): EnteredSecrets {
  if (form.platform === 's3') {
    return {
      platform: 's3',
      accessKeyId: form.accessKeyId,
      secretAccessKey: form.secretAccessKey
    }
  }
  if (form.platform === 'azure') return { platform: 'azure', accountKey: form.accountKey }
  return { platform: 'google-drive', clientId: form.clientId, clientSecret: form.clientSecret }
}

// `templates` are the ones whose keys may be copied.
export function newTemplate(form: TemplateFormValues, templates: Template[]): NewTemplate {
  const base = {
    platform: form.platform,
    kind: form.kind,
    name: form.name,
    location: form.location
  }
  if (!isCopyingKeys(form, templates)) {
    return { ...base, keys: { source: 'entered', secrets: enteredSecrets(form) } }
  }
  return {
    ...base,
    keys: { source: 'copied', templateId: selectedTemplate(templates, form.copyFrom).id }
  }
}

// The form filled in with a template to change, keeping its keys.
export function formFor(template: Template): TemplateFormValues {
  return {
    platform: template.platform,
    kind: template.kind,
    name: template.name,
    location: locationInput(template),
    keySource: 'kept',
    accessKeyId: '',
    secretAccessKey: '',
    accountKey: '',
    clientId: '',
    clientSecret: '',
    copyFrom: ''
  }
}

// `templates` are the ones whose keys may be copied: those on the platform, but not the one being changed.
export function templateEdit(
  form: TemplateFormValues,
  id: string,
  templates: Template[]
): TemplateEdit {
  if (form.keySource !== 'kept') return { id, ...newTemplate(form, templates) }
  return {
    id,
    platform: form.platform,
    kind: form.kind,
    name: form.name,
    location: form.location,
    keys: { source: 'kept' }
  }
}

// What the IAM user, account key or Google account needs for the template's type, below the type's buttons.
export function accessHint(form: TemplateFormValues): string {
  if (form.platform === 's3') return `The IAM user needs ${PERMISSIONS[form.kind].summary}`
  return ACCESS_HINTS[form.platform][form.kind]
}
