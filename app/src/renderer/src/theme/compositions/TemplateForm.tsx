// The form that adds a template, or changes one: platform, type, name, location, and the keys, typed in, copied from a
// template on the same platform, or kept when changing. See docs/UI.md.
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import type {
  NewTemplate,
  Platform,
  Template,
  TemplateEdit
} from '../../../../shared/types/template-types'
import {
  BETA_HINT,
  ENTERED_KEYS_LABELS,
  KEYS_LABELS,
  LOCATION_LABELS,
  PLATFORM_OPTIONS,
  ROOT_NOUNS
} from '../../constants/platform-constants'
import {
  EDIT_KEY_SOURCE_OPTIONS,
  EMPTY_TEMPLATE_FORM,
  KEY_SOURCE_OPTIONS,
  TEMPLATE_KIND_OPTIONS
} from '../../constants/template-constants'
import { templateService } from '../../services/template-service'
import type { TemplateFormTextField, TemplateFormValues } from '../../types/template-form-types'
import { messageOf } from '../../utils/error-utils'
import { templateLocation } from '../../utils/location-utils'
import {
  accessHint,
  copySourcesFor,
  formFor,
  isCopyingKeys,
  locationHint,
  newTemplate,
  signsIn,
  templateEdit
} from '../../utils/template-form-utils'
import { selectedTemplate, sortByName } from '../../utils/template-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Field } from '../components/Field'
import { Section } from '../components/Section'
import { Select } from '../components/Select'
import { StatusMessage } from '../components/StatusMessage'
import { ToggleGroup } from '../components/ToggleGroup'
import { INPUT_CLASS } from '../styles/style-constants'
import { AddIcon, CancelIcon, SaveIcon } from '../components/icons'
import { TemplateKeyFields } from './TemplateKeyFields'

// onCreate and onUpdate throw when main refuses; the form then shows why and keeps what was typed.
// The page gives the form a new key for each template it edits, so it starts from that template.
export function TemplateForm({
  templates,
  editing,
  encryptionAvailable,
  message,
  onCreate,
  onUpdate,
  onCancelEdit
}: {
  templates: Template[]
  editing: Template | null
  encryptionAvailable: boolean
  message: string | undefined
  onCreate: (template: NewTemplate) => Promise<void>
  onUpdate: (edit: TemplateEdit) => Promise<void>
  onCancelEdit: () => void
}): React.JSX.Element {
  const [form, setForm] = useState<TemplateFormValues>(() =>
    editing === null ? EMPTY_TEMPLATE_FORM : formFor(editing)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const formRef = useRef<HTMLFormElement>(null)
  // Keys copy only between templates on the same platform, and a template can't copy its own: keeping them does that.
  const copySources = copySourcesFor(form, templates, editing === null ? null : editing.id)
  const copying = isCopyingKeys(form, copySources)
  const samePlatform = editing !== null && editing.platform === form.platform
  const enteredLabel = ENTERED_KEYS_LABELS[form.platform][samePlatform ? 'changed' : 'added']
  const keyOptions = (samePlatform ? EDIT_KEY_SOURCE_OPTIONS : KEY_SOURCE_OPTIONS)
    .filter((option) => option.value !== 'copied' || copySources.length > 0)
    .map((option) => (option.value === 'entered' ? { ...option, label: enteredLabel } : option))
  const needsEncryption = !samePlatform || form.keySource !== 'kept'
  const waitingForGoogle = saving && signsIn(form, copySources)

  // Scrolls to the section, so its title shows above the form.
  useEffect(() => {
    if (editing !== null) formRef.current?.closest('section')?.scrollIntoView({ block: 'start' })
  }, [editing])

  const update =
    (field: TemplateFormTextField) =>
    (event: ChangeEvent<HTMLInputElement>): void =>
      setForm((previous) => ({ ...previous, [field]: event.target.value }))

  // Another platform needs its own keys; back on the template's own, it keeps them again.
  const choosePlatform = (platform: Platform): void =>
    setForm((previous) => ({
      ...previous,
      platform,
      keySource: editing !== null && editing.platform === platform ? 'kept' : 'entered',
      copyFrom: ''
    }))

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      if (editing === null) {
        await onCreate(newTemplate(form, copySources))
        setForm({ ...EMPTY_TEMPLATE_FORM, platform: form.platform })
      } else {
        await onUpdate(templateEdit(form, editing.id, copySources))
      }
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  const savingLabel = waitingForGoogle
    ? 'Waiting for Google sign-in in your browser…'
    : `Checking the ${ROOT_NOUNS[form.platform]}…`

  return (
    <Section title={editing === null ? 'New template' : `Edit “${editing.name}”`}>
      <form
        ref={formRef}
        aria-label={editing === null ? 'New template' : `Edit ${editing.name}`}
        className="max-w-2xl space-y-6"
        onSubmit={(event) => void submit(event)}
      >
        <ToggleGroup
          label="Platform"
          options={PLATFORM_OPTIONS}
          value={form.platform}
          hint={BETA_HINT[form.platform]}
          onChange={choosePlatform}
        />
        <ToggleGroup
          label="Type"
          options={TEMPLATE_KIND_OPTIONS}
          value={form.kind}
          hint={accessHint(form)}
          onChange={(kind) => setForm((previous) => ({ ...previous, kind }))}
        />
        <Field label="Name" hint="Shown when you choose a template, for example Reports.">
          <input className={INPUT_CLASS} value={form.name} onChange={update('name')} required />
        </Field>
        <Field label={LOCATION_LABELS[form.platform]} hint={locationHint(form)}>
          <input
            className={INPUT_CLASS}
            value={form.location}
            onChange={update('location')}
            spellCheck={false}
            required
          />
        </Field>

        {keyOptions.length > 1 && (
          <ToggleGroup
            label={KEYS_LABELS[form.platform]}
            options={keyOptions}
            value={form.keySource}
            onChange={(keySource) => setForm((previous) => ({ ...previous, keySource }))}
          />
        )}
        {form.keySource === 'kept' && (
          <p className="text-sm text-muted">The template keeps the keys it has.</p>
        )}
        {copying && (
          <Select
            label="Copy the keys of"
            options={sortByName(copySources).map((template) => ({
              value: template.id,
              label: template.name,
              detail: templateLocation(template)
            }))}
            value={selectedTemplate(copySources, form.copyFrom).id}
            hint="The keys are copied on this computer and never shown."
            onChange={(copyFrom) => setForm((previous) => ({ ...previous, copyFrom }))}
          />
        )}
        {form.keySource !== 'kept' && !copying && (
          <TemplateKeyFields form={form} onChange={update} />
        )}

        <div className="flex flex-wrap justify-end gap-3">
          {waitingForGoogle && (
            <Button onClick={() => void templateService.cancelSignIn()}>
              <CancelIcon />
              Cancel sign-in
            </Button>
          )}
          {editing !== null && !saving && <Button onClick={onCancelEdit}>Cancel</Button>}
          <Button
            type="submit"
            variant="primary"
            disabled={saving || (needsEncryption && !encryptionAvailable)}
          >
            {editing === null ? <AddIcon /> : <SaveIcon />}
            {saving ? savingLabel : editing === null ? 'Add template' : 'Save changes'}
          </Button>
        </div>
        <StatusMessage message={message} />
        <ErrorMessage message={error} />
      </form>
    </Section>
  )
}
