// A button that copies a text through main, then says whether it worked. See docs/UI.md.
import { useState } from 'react'
import { Button } from './Button'
import { CopyIcon } from './icons'

export function CopyButton({
  text,
  label = 'Copy',
  className = '',
  onCopy
}: {
  text: string
  label?: string
  className?: string
  onCopy: (text: string) => Promise<void>
}): React.JSX.Element {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <Button
      className={className}
      onClick={() =>
        onCopy(text).then(
          () => setState('copied'),
          () => setState('failed')
        )
      }
    >
      <CopyIcon />
      {state === 'copied' ? 'Copied' : state === 'failed' ? "Couldn't copy" : label}
    </Button>
  )
}
