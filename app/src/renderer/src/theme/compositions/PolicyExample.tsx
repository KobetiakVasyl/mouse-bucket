// An example IAM policy for one template type, titled with what it allows. See docs/UI.md.
import type { TemplateKind } from '../../../../shared/types/template-types'
import { PERMISSIONS } from '../../constants/permission-constants'
import { TEMPLATE_KIND_LABELS } from '../../constants/template-constants'
import { policyJson } from '../../utils/permission-utils'
import { appService } from '../../services/app-service'
import { CodeBlock } from '../components/CodeBlock'

export function PolicyExample({ kind }: { kind: TemplateKind }): React.JSX.Element {
  const { summary, statements } = PERMISSIONS[kind]
  return (
    <div>
      <h3 className="mb-1 font-semibold">
        {TEMPLATE_KIND_LABELS[kind]} templates: {summary}
      </h3>
      <CodeBlock text={policyJson(statements)} onCopy={(text) => appService.copy(text)} />
    </div>
  )
}
