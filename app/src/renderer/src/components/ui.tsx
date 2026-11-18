// Small building blocks in the grayscale style, with rounded corners everywhere. See docs/UI.md.
import { type ButtonHTMLAttributes, type ReactNode, useEffect } from 'react'

export const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

export const inputClass = `w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted hover:border-muted focus:border-ink disabled:pointer-events-none disabled:opacity-50 ${FOCUS}`

// Danger is the only color: red, for actions that delete something.
const BUTTON_LOOKS = {
  primary: 'border-ink bg-ink text-paper hover:opacity-85',
  secondary: 'border-line bg-surface text-ink hover:border-muted hover:bg-hover',
  danger: 'border-danger bg-surface text-danger hover:bg-danger hover:text-paper'
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_LOOKS
}

export function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      type={type}
      className={`rounded-lg border px-4 py-2 disabled:pointer-events-none disabled:opacity-40 ${BUTTON_LOOKS[variant]} ${FOCUS} ${className}`}
      {...props}
    />
  )
}

export function PageHeading({
  title,
  children
}: {
  title: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {children !== undefined && <p className="mt-2 max-w-3xl text-muted">{children}</p>}
    </header>
  )
}

export function Field({
  label,
  hint,
  children
}: {
  label: ReactNode
  hint?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 font-semibold">{label}</span>
      {children}
      {hint !== undefined && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  )
}

export function SoonBadge(): React.JSX.Element {
  return (
    <span className="rounded-full border border-line px-2 py-0.5 text-xs font-normal text-muted">
      Soon
    </span>
  )
}

export function Notice({ children }: { children: ReactNode }): React.JSX.Element {
  return <p className="mb-6 max-w-3xl rounded-xl border border-line bg-surface p-4">{children}</p>
}

export function ErrorMessage({
  message
}: {
  message: string | undefined
}): React.JSX.Element | null {
  if (message === undefined) return null
  return (
    <p
      role="alert"
      className="mt-4 max-w-3xl rounded-xl border border-l-4 border-line border-l-danger bg-surface p-3 font-semibold"
    >
      {message}
    </p>
  )
}

export interface ToggleOption<T extends string> {
  value: T
  label: string
}

// Toggle buttons instead of radio buttons: exactly one option is pressed.
export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <div>
      <span className="mb-1 block font-semibold">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1"
      >
        {options.map((option) => {
          const pressed = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              className={`rounded-lg px-4 py-1.5 ${pressed ? 'bg-ink text-paper' : 'text-ink hover:bg-hover'} ${FOCUS}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const TABLE_HEAD_ROW = 'border-b border-line text-left text-sm text-muted'
export const TABLE_ROW = 'border-b border-line last:border-b-0 hover:bg-hover'
export const CELL = 'px-4 py-2.5'

// A full-width table inside a rounded frame.
export function TableFrame({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  )
}

// A dialog over the page. Escape closes it.
export function Modal({
  title,
  onClose,
  children
}: {
  title: string
  onClose: () => void
  children: ReactNode
}): React.JSX.Element {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-paper/80 p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8"
      >
        <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

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
