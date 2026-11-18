// How to make an IAM user for MouseBucket with AWS CloudShell, without root or admin keys: the steps, and the script to
// copy. See docs/UI.md.
import { IAM_USER_NAME } from '../../constants/permission-constants'
import { appService } from '../../services/app-service'
import { cloudShellScript } from '../../utils/permission-utils'
import { CodeBlock } from '../components/CodeBlock'

export function CloudShellSetup(): React.JSX.Element {
  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-6">
        <li>
          Sign in to the AWS console, and open CloudShell: the terminal button at the top of the
          page.
        </li>
        <li>
          Paste this script and press Enter. It makes the IAM user &quot;{IAM_USER_NAME}&quot;,
          unless it exists, lets it read and write every S3 bucket in the account, and prints a new
          access key for it.
        </li>
        <li>Copy the access key ID and the secret access key it printed into the template.</li>
      </ol>
      <CodeBlock text={cloudShellScript()} onCopy={(text) => appService.copy(text)} />
      <p className="text-sm text-muted">
        No root or admin keys are needed: CloudShell runs as you, signed in to the console. Each run
        makes another access key, and a user can have two.
      </p>
    </div>
  )
}
