// The Templates page: the saved templates, and the form that adds one or changes the one being edited. See docs/UI.md.
import { useCallback, useState } from 'react'
import type { NewTemplate, Template, TemplateEdit } from '../../../shared/types/template-types'
import { templateService } from '../services/template-service'
import { Notice } from '../theme/components/Notice'
import { PageHeading } from '../theme/components/PageHeading'
import { ConfirmDialog } from '../theme/compositions/ConfirmDialog'
import { TemplateForm } from '../theme/compositions/TemplateForm'
import { TemplateTable } from '../theme/compositions/TemplateTable'
import { messageOf } from '../utils/error-utils'

export function TemplatesPage({
  templates,
  encryptionAvailable,
  firstRun,
  onCreated,
  onUpdated,
  onDeleted
}: {
  templates: Template[]
  encryptionAvailable: boolean
  firstRun: boolean
  onCreated: (template: Template) => void
  onUpdated: (template: Template) => void
  onDeleted: (id: string) => void
}): React.JSX.Element {
  const [message, setMessage] = useState<string>()
  const [editing, setEditing] = useState<Template | null>(null)
  const [deleting, setDeleting] = useState<Template | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()

  const create = async (newTemplate: NewTemplate): Promise<void> => {
    setMessage(undefined)
    const template = await templateService.create(newTemplate)
    setMessage(`Added "${template.name}".`)
    onCreated(template)
  }

  const update = async (edit: TemplateEdit): Promise<void> => {
    setMessage(undefined)
    const template = await templateService.update(edit)
    setMessage(`Saved "${template.name}".`)
    setEditing(null)
    onUpdated(template)
  }

  const closeDelete = useCallback((): void => {
    setDeleting(null)
    setDeleteError(undefined)
  }, [])

  const confirmDelete = async (template: Template): Promise<void> => {
    setDeleteBusy(true)
    setDeleteError(undefined)
    try {
      await templateService.delete(template.id)
      onDeleted(template.id)
      if (editing !== null && editing.id === template.id) setEditing(null)
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

      {templates.length > 0 && (
        <div className="mb-10">
          <TemplateTable
            templates={templates}
            onEdit={(template) => {
              setMessage(undefined)
              setEditing(template)
            }}
            onDelete={setDeleting}
          />
        </div>
      )}

      <TemplateForm
        key={editing === null ? 'new' : editing.id}
        templates={templates}
        editing={editing}
        encryptionAvailable={encryptionAvailable}
        message={message}
        onCreate={create}
        onUpdate={update}
        onCancelEdit={() => setEditing(null)}
      />

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
