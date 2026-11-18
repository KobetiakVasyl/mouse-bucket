// The Upload page: pick an upload template and a storage class, see the upload settings, then pick or drop files and folders. See docs/UI.md.
import { useState } from 'react'
import type { UploadStorageClass } from '../../../shared/types/s3-types'
import type { Template } from '../../../shared/types/template-types'
import type { Transfer } from '../../../shared/types/transfer-types'
import { NOTHING_DROPPED_MESSAGE } from '../constants/upload-constants'
import { uploadService } from '../services/upload-service'
import { Button } from '../theme/components/Button'
import { ErrorMessage } from '../theme/components/ErrorMessage'
import { PageHeading } from '../theme/components/PageHeading'
import { StatusMessage } from '../theme/components/StatusMessage'
import { TemplatePicker } from '../theme/compositions/TemplatePicker'
import { DropZone } from '../theme/compositions/DropZone'
import { TransferList } from '../theme/compositions/TransferList'
import { UploadSettings } from '../theme/compositions/UploadSettings'
import { messageOf } from '../utils/error-utils'
import { selectedTemplate, sortByName } from '../utils/template-utils'
import { transfersOfKind } from '../utils/transfer-utils'
import { queuedMessage } from '../utils/upload-utils'
import { ChooseFilesIcon, ChooseFolderIcon } from '../theme/components/icons'

// Shown only while at least one upload template exists.
export function UploadPage({
  templates,
  transfers,
  defaultStorageClass
}: {
  templates: Template[]
  transfers: Transfer[]
  defaultStorageClass: UploadStorageClass
}): React.JSX.Element {
  const [selectedId, setSelectedId] = useState(() => sortByName(templates)[0].id)
  const [storageClass, setStorageClass] = useState(defaultStorageClass)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const template = selectedTemplate(templates, selectedId)

  const request = { templateId: template.id, storageClass }

  // A cancelled picker queues nothing and says nothing; a drop that brought nothing says so.
  const queue = async (pick: () => Promise<number>, nothing?: string): Promise<void> => {
    setBusy(true)
    setMessage(undefined)
    setError(undefined)
    try {
      const queued = await pick()
      setMessage(queued > 0 ? queuedMessage(queued) : nothing)
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading title="Upload">Files keep their names on the way to the bucket.</PageHeading>
      <TemplatePicker templates={templates} selectedId={selectedId} onSelect={setSelectedId} />
      <UploadSettings
        template={template}
        storageClass={storageClass}
        onStorageClassChange={setStorageClass}
      />

      <DropZone
        onDrop={(files) =>
          void queue(() => uploadService.uploadDropped(request, files), NOTHING_DROPPED_MESSAGE)
        }
      >
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => void queue(() => uploadService.chooseFiles(request))}
        >
          <ChooseFilesIcon />
          Choose files…
        </Button>
        <Button
          disabled={busy}
          onClick={() => void queue(() => uploadService.chooseFolder(request))}
        >
          <ChooseFolderIcon />
          Choose a folder…
        </Button>
      </DropZone>
      <StatusMessage message={message} className="mt-4" />
      <ErrorMessage message={error} />
      <TransferList transfers={transfersOfKind(transfers, 'upload')} />
    </>
  )
}
