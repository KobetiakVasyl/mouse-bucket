// The form that adds a template, or changes one: type, name, S3 location, and the IAM user's keys, typed in, copied,
// or kept when changing. See docs/UI.md.
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import type { NewTemplate, Template, TemplateEdit } from '../../../../shared/types/template-types'
import { PERMISSIONS } from '../../constants/permission-constants'
import {
  EDIT_KEY_SOURCE_OPTIONS,
  EMPTY_TEMPLATE_FORM,
  KEY_SOURCE_OPTIONS,
  TEMPLATE_KIND_OPTIONS
} from '../../constants/template-constants'
import type { TemplateFormTextField, TemplateFormValues } from '../../types/template-form-types'
import { messageOf } from '../../utils/error-utils'
import { formatS3Location } from '../../utils/s3-location-utils'
import {
  formFor,
  isCopyingKeys,
  locationHint,
  newTemplate,
  templateEdit
} from '../../utils/template-form-utils'
import { selectedTemplate, sortByName } from '../../utils/template-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'
import { ToggleGroup } from '../components/ToggleGroup'
import { INPUT_CLASS } from '../styles/style-constants'
import { AddIcon, SaveIcon } from '../components/icons'

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
  // A template can't copy its own keys; keeping them does that.
  const copySources =
    editing === null ? templates : templates.filter((template) => template.id !== editing.id)
  const copying = isCopyingKeys(form, copySources)
  const keyOptions = (editing === null ? KEY_SOURCE_OPTIONS : EDIT_KEY_SOURCE_OPTIONS).filter(
    (option) => option.value !== 'copied' || copySources.length > 0
  )
  const needsEncryption = editing === null || form.keySource !== 'kept'

  useEffect(() => {
    if (editing !== null) formRef.current?.scrollIntoView({ block: 'start' })
  }, [editing])

  const update =
    (field: TemplateFormTextField) =>
    (event: ChangeEvent<HTMLInputElement>): void =>
      setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      if (editing === null) {
        await onCreate(newTemplate(form, copySources))
        setForm(EMPTY_TEMPLATE_FORM)
      } else {
        await onUpdate(templateEdit(form, editing.id, copySources))
      }
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      ref={formRef}
      aria-label={editing === null ? 'New template' : `Edit ${editing.name}`}
      className="max-w-xl space-y-6"
      onSubmit={(event) => void submit(event)}
    >
      <h2 className="text-xl font-semibold">
        {editing === null ? 'New template' : `Edit “${editing.name}”`}
      </h2>
      <div>
        <ToggleGroup
          label="Type"
          options={TEMPLATE_KIND_OPTIONS}
          value={form.kind}
          onChange={(kind) => setForm((previous) => ({ ...previous, kind }))}
        />
        <p className="mt-1 text-sm text-muted">
          The IAM user needs {PERMISSIONS[form.kind].summary}
        </p>
      </div>
      <Field label="Name" hint="Shown when you choose a template, for example Reports.">
        <input className={INPUT_CLASS} value={form.name} onChange={update('name')} required />
      </Field>
      <Field label="S3 location" hint={locationHint(form)}>
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
          label="IAM user"
          options={keyOptions}
          value={form.keySource}
          onChange={(keySource) => setForm((previous) => ({ ...previous, keySource }))}
        />
      )}
      {form.keySource === 'kept' && (
        <p className="text-sm text-muted">The template keeps the keys it has.</p>
      )}
      {copying && (
        <Field
          label="Copy the keys of"
          hint="The keys are copied on this computer and never shown."
        >
          <select
            className={INPUT_CLASS}
            value={selectedTemplate(copySources, form.copyFrom).id}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, copyFrom: event.target.value }))
            }
          >
            {sortByName(copySources).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({formatS3Location(template)})
              </option>
            ))}
          </select>
        </Field>
      )}
      {form.keySource !== 'kept' && !copying && (
        <>
          <Field label="Access key ID">
            <input
              className={INPUT_CLASS}
              value={form.accessKeyId}
              onChange={update('accessKeyId')}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </Field>
          <Field label="Secret access key">
            <input
              className={INPUT_CLASS}
              type="password"
              value={form.secretAccessKey}
              onChange={update('secretAccessKey')}
              autoComplete="off"
              required
            />
          </Field>
        </>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={saving || (needsEncryption && !encryptionAvailable)}
        >
          {editing === null ? <AddIcon /> : <SaveIcon />}
          {saving ? 'Checking the bucket…' : editing === null ? 'Add template' : 'Save changes'}
        </Button>
        {editing !== null && <Button onClick={onCancelEdit}>Cancel</Button>}
      </div>
      <StatusMessage message={message} />
      <ErrorMessage message={error} />
    </form>
  )
}
