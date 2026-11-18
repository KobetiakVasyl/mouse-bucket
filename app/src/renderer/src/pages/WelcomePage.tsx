// The welcome page, shown over the app on first start and from the side menu. See docs/UI.md.
import { Button } from '../components/ui'

export function WelcomePage({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 flex items-center justify-center bg-paper p-8"
    >
      <div className="max-w-xl rounded-2xl border border-line bg-surface p-10">
        <h1 id="welcome-title" className="mb-6 text-4xl font-semibold">
          Welcome to MouseBucket
        </h1>
        <p className="mb-4">
          MouseBucket uploads files from this computer to an Amazon S3 bucket, and downloads files
          from one, with your own IAM user&apos;s keys. There&apos;s no account to sign up for, and
          your files go straight between this computer and AWS.
        </p>
        <ol className="mb-4 list-decimal pl-6">
          <li className="mb-2">
            Add a template: an S3 location plus the IAM keys that reach it. Upload templates point
            at a folder, download templates at a whole bucket.
          </li>
          <li>On the Home page, choose Upload or Download, then pick a template.</li>
        </ol>
        <p className="mb-8">Your keys stay on this computer, encrypted by the operating system.</p>
        <Button variant="primary" onClick={onClose} autoFocus>
          Close
        </Button>
      </div>
    </div>
  )
}
