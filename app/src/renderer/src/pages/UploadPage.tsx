// The Upload page: pick an upload template, see the upload settings, then pick files. See docs/UI.md.
import { useState } from 'react'
import type { Template, Transfer } from '../../../shared/ipc'
import { formatS3Location } from '../../../shared/s3-location'
import { storageClassLabel, UPLOAD_CHECKSUM, UPLOAD_STORAGE_CLASS } from '../../../shared/storage'
import { api, messageOf } from '../api'
import { TemplatePicker } from '../components/TemplatePicker'
import { TransferList } from '../components/TransferList'
import { Button, ErrorMessage, Field, inputClass, PageHeading, SoonBadge } from '../components/ui'
import { selectedTemplate, sortByName } from '../template-order'

// Shown only while at least one upload template exists.
export function UploadPage({
  templates,
  transfers
}: {
  templates: Template[]
  transfers: Transfer[]
}): React.JSX.Element {
  const [selectedId, setSelectedId] = useState(() => sortByName(templates)[0].id)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const template = selectedTemplate(templates, selectedId)

  const chooseFiles = async (): Promise<void> => {
    setBusy(true)
    setMessage(undefined)
    setError(undefined)
    try {
      const queued = await api.chooseFilesToUpload(template.id)
      if (queued > 0) {
        setMessage(`${queued} ${queued === 1 ? 'file' : 'files'} added to the transfers.`)
      }
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setBusy(false)
    }
  }

  const settings: [string, string][] = [
    ['Destination', formatS3Location(template)],
    ['Storage class', storageClassLabel(UPLOAD_STORAGE_CLASS)],
    ['Encryption', "The bucket's default encryption"],
    ['Checksum', UPLOAD_CHECKSUM],
    ['Versioning', "The bucket's own setting, which the app never changes"],
    ['Same file name', 'The file in the bucket is replaced']
  ]

  return (
    <>
      <PageHeading title="Upload">Files keep their names on the way to the bucket.</PageHeading>
      <TemplatePicker templates={templates} selectedId={selectedId} onSelect={setSelectedId} />

      <section className="mt-8 max-w-3xl rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-xl font-semibold">Upload settings</h2>
        <dl className="grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2">
          {settings.map(([name, value]) => (
            <div key={name} className="contents">
              <dt className="text-muted">{name}</dt>
              <dd className="break-all">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label={
              <>
                Tags <SoonBadge />
              </>
            }
          >
            <input className={inputClass} placeholder="project=reports" disabled />
          </Field>
          <Field
            label={
              <>
                Metadata <SoonBadge />
              </>
            }
          >
            <input className={inputClass} placeholder="x-amz-meta-owner=me" disabled />
          </Field>
        </div>
      </section>

      <Button className="mt-6" variant="primary" disabled={busy} onClick={() => void chooseFiles()}>
        Choose files…
      </Button>
      {message !== undefined && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
      <ErrorMessage message={error} />
      <TransferList transfers={transfers.filter((transfer) => transfer.kind === 'upload')} />
    </>
  )
}
