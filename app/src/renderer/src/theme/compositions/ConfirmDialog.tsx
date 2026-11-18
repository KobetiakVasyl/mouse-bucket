// Asks before a destructive action, with Cancel focused and the action in red. See docs/UI.md.
import type { ReactNode } from 'react'
import { Button } from '../components/Button'
import { ErrorMessage } from '../components/ErrorMessage'
import { Modal } from '../components/Modal'

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  busy: boolean
  error: string | undefined
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="mb-6">{message}</div>
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button variant="danger" disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
      <ErrorMessage message={error} />
    </Modal>
  )
}
