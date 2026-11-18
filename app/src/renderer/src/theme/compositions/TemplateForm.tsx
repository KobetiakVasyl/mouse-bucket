// The form that adds a template: type, name, S3 location, and the IAM user's keys, typed in or copied. See docs/UI.md.
import { type ChangeEvent, type FormEvent, useState } from 'react'
import type { NewTemplate, Template } from '../../../../shared/types/template-types'
import { formatS3Location } from '../../utils/s3-location-utils'
import { PERMISSIONS } from '../../constants/permission-constants'
import {
  EMPTY_TEMPLATE_FORM,
  KEY_SOURCE_OPTIONS,
  TEMPLATE_KIND_OPTIONS
} from '../../constants/template-constants'
import type { TemplateFormTextField, TemplateFormValues } from '../../types/template-form-types'
import { messageOf } from '../../utils/error-utils'
import { isCopyingKeys, locationHint, newTemplate } from '../../utils/template-form-utils'
import { selectedTemplate, sortByName } from '../../utils/template-utils'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'
import { ToggleGroup } from '../components/ToggleGroup'
import { INPUT_CLASS } from '../styles/style-constants'

// onCreate throws when main refuses the template; the form then shows why and keeps what was typed.
export function TemplateForm({
  templates,
  encryptionAvailable,
  message,
  onCreate
}: {
  templates: Template[]
  encryptionAvailable: boolean
  message: string | undefined
  onCreate: (template: NewTemplate) => Promise<void>
}): React.JSX.Element {
  const [form, setForm] = useState<TemplateFormValues>(EMPTY_TEMPLATE_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const copying = isCopyingKeys(form, templates)

  const update =
    (field: TemplateFormTextField) =>
    (event: ChangeEvent<HTMLInputElement>): void =>
      setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      await onCreate(newTemplate(form, templates))
      setForm(EMPTY_TEMPLATE_FORM)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="max-w-xl space-y-6" onSubmit={(event) => void submit(event)}>
      <h2 className="text-xl font-semibold">New template</h2>
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

      {templates.length > 0 && (
        <ToggleGroup
          label="IAM user"
          options={KEY_SOURCE_OPTIONS}
          value={form.keySource}
          onChange={(keySource) => setForm((previous) => ({ ...previous, keySource }))}
        />
      )}
      {copying ? (
        <Field
          label="Copy the keys of"
          hint="The keys are copied on this computer and never shown."
        >
          <select
            className={INPUT_CLASS}
            value={selectedTemplate(templates, form.copyFrom).id}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, copyFrom: event.target.value }))
            }
          >
            {sortByName(templates).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({formatS3Location(template)})
              </option>
            ))}
          </select>
        </Field>
      ) : (
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

      <Button type="submit" variant="primary" disabled={!encryptionAvailable || saving}>
        {saving ? 'Checking the bucket…' : 'Add template'}
      </Button>
      <StatusMessage message={message} />
      <ErrorMessage message={error} />
    </form>
  )
}
