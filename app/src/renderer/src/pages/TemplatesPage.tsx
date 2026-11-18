// The Templates page: the saved templates, and the form that adds one. See docs/UI.md.
import { type ChangeEvent, type FormEvent, useCallback, useState } from 'react'
import type { NewTemplate, Template, TemplateKind } from '../../../shared/ipc'
import { formatS3Location, parseS3Location } from '../../../shared/s3-location'
import { api, messageOf } from '../api'
import {
  Button,
  CELL,
  ConfirmDialog,
  ErrorMessage,
  Field,
  inputClass,
  Notice,
  PageHeading,
  TABLE_HEAD_ROW,
  TABLE_ROW,
  TableFrame,
  ToggleGroup
} from '../components/ui'
import { selectedTemplate, sortByName } from '../template-order'

type KeySource = 'entered' | 'copied'

interface Form {
  kind: TemplateKind
  name: string
  location: string
  keySource: KeySource
  accessKeyId: string
  secretAccessKey: string
  // The template whose keys a copy uses.
  copyFrom: string
}

const EMPTY_FORM: Form = {
  kind: 'upload',
  name: '',
  location: '',
  keySource: 'entered',
  accessKeyId: '',
  secretAccessKey: '',
  copyFrom: ''
}

const PERMISSIONS = {
  upload: 's3:PutObject on the folder, plus s3:AbortMultipartUpload for large files.',
  download:
    's3:ListBucket on the bucket, and s3:GetObject, s3:RestoreObject and s3:DeleteObject on its files.'
}

function locationHint(form: Form): string {
  if (form.location.trim() === '') {
    return form.kind === 'upload'
      ? 'For example s3://my-bucket/folder/'
      : 'For example s3://my-bucket'
  }
  const parsed = parseS3Location(form.location)
  if ('error' in parsed) return parsed.error
  if (form.kind === 'download' && parsed.location.prefix !== '') {
    return 'A download template points at a whole bucket. Remove the folder.'
  }
  const where = formatS3Location(parsed.location)
  return form.kind === 'upload' ? `Uploads go to ${where}` : `Downloads browse ${where}`
}

// Copying needs a template to copy from, so with none saved the keys are always typed in.
function newTemplate(form: Form, templates: Template[]): NewTemplate {
  const base = { kind: form.kind, name: form.name, location: form.location }
  if (templates.length === 0) return { ...base, keys: enteredKeys(form) }
  if (form.keySource === 'entered') return { ...base, keys: enteredKeys(form) }
  return {
    ...base,
    keys: { source: 'copied', templateId: selectedTemplate(templates, form.copyFrom).id }
  }
}

function enteredKeys(form: Form): NewTemplate['keys'] {
  return {
    source: 'entered',
    accessKeyId: form.accessKeyId,
    secretAccessKey: form.secretAccessKey
  }
}

export function TemplatesPage({
  templates,
  encryptionAvailable,
  firstRun,
  onCreated,
  onDeleted
}: {
  templates: Template[]
  encryptionAvailable: boolean
  firstRun: boolean
  onCreated: (template: Template) => void
  onDeleted: (id: string) => void
}): React.JSX.Element {
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const [deleting, setDeleting] = useState<Template | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()
  const sorted = sortByName(templates)
  const copying = templates.length > 0 && form.keySource === 'copied'

  const update =
    (field: 'name' | 'location' | 'accessKeyId' | 'secretAccessKey') =>
    (event: ChangeEvent<HTMLInputElement>): void =>
      setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setMessage(undefined)
    setError(undefined)
    try {
      const template = await api.createTemplate(newTemplate(form, templates))
      setForm(EMPTY_FORM)
      setMessage(`Added "${template.name}".`)
      onCreated(template)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSaving(false)
    }
  }

  const closeDelete = useCallback((): void => {
    setDeleting(null)
    setDeleteError(undefined)
  }, [])

  const confirmDelete = async (template: Template): Promise<void> => {
    setDeleteBusy(true)
    setDeleteError(undefined)
    try {
      await api.deleteTemplate(template.id)
      onDeleted(template.id)
      setMessage(`Deleted "${template.name}".`)
      closeDelete()
    } catch (reason) {
      setDeleteError(messageOf(reason))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <>
      <PageHeading title="Templates">
        A template is an S3 location plus the IAM keys that reach it. Upload templates point at a
        folder, download templates at a whole bucket.
      </PageHeading>

      {firstRun && <Notice>Add your first template to start uploading or downloading.</Notice>}
      {!encryptionAvailable && (
        <Notice>
          MouseBucket can&apos;t store keys securely on this computer, because no keyring is
          running. Start one, such as GNOME Keyring or KWallet, then restart the app.
        </Notice>
      )}

      {sorted.length > 0 && (
        <div className="mb-10">
          <TableFrame>
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className={CELL}>Name</th>
                <th className={CELL}>Type</th>
                <th className={CELL}>Location</th>
                <th className={CELL}>Region</th>
                <th className={CELL} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((template) => (
                <tr key={template.id} className={TABLE_ROW}>
                  <td className={CELL}>{template.name}</td>
                  <td className={CELL}>{template.kind === 'upload' ? 'Upload' : 'Download'}</td>
                  <td className={`${CELL} break-all`}>{formatS3Location(template)}</td>
                  <td className={CELL}>{template.region}</td>
                  <td className={`${CELL} text-right`}>
                    <Button
                      className="text-sm"
                      variant="danger"
                      onClick={() => setDeleting(template)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
        </div>
      )}

      <form className="max-w-xl space-y-6" onSubmit={(event) => void submit(event)}>
        <h2 className="text-xl font-semibold">New template</h2>
        <div>
          <ToggleGroup
            label="Type"
            options={[
              { value: 'upload', label: 'Upload' },
              { value: 'download', label: 'Download' }
            ]}
            value={form.kind}
            onChange={(kind) => setForm((previous) => ({ ...previous, kind }))}
          />
          <p className="mt-1 text-sm text-muted">The IAM user needs {PERMISSIONS[form.kind]}</p>
        </div>
        <Field label="Name" hint="Shown when you choose a template, for example Reports.">
          <input className={inputClass} value={form.name} onChange={update('name')} required />
        </Field>
        <Field label="S3 location" hint={locationHint(form)}>
          <input
            className={inputClass}
            value={form.location}
            onChange={update('location')}
            spellCheck={false}
            required
          />
        </Field>

        {templates.length > 0 && (
          <ToggleGroup
            label="IAM user"
            options={[
              { value: 'entered', label: 'Enter keys' },
              { value: 'copied', label: 'Copy from a template' }
            ]}
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
              className={inputClass}
              value={selectedTemplate(templates, form.copyFrom).id}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, copyFrom: event.target.value }))
              }
            >
              {sorted.map((template) => (
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
                className={inputClass}
                value={form.accessKeyId}
                onChange={update('accessKeyId')}
                autoComplete="off"
                spellCheck={false}
                required
              />
            </Field>
            <Field label="Secret access key">
              <input
                className={inputClass}
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
        {message !== undefined && <p role="status">{message}</p>}
        <ErrorMessage message={error} />
      </form>

      {deleting !== null && (
        <ConfirmDialog
          title="Delete this template?"
          message={
            <p>
              <strong>{deleting.name}</strong> and its keys are deleted from this computer. Nothing
              in the bucket changes.
            </p>
          }
          confirmLabel="Delete"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete(deleting)}
          onCancel={closeDelete}
        />
      )}
    </>
  )
}
