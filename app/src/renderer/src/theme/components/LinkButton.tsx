// A button that looks like an underlined link, such as a folder name. See docs/UI.md.
import type { ReactNode } from 'react'
import { LINK_CLASS } from '../styles/style-constants'

export function LinkButton({
  onClick,
  children
}: {
  onClick: () => void
  children: ReactNode
}): React.JSX.Element {
  return (
    <button type="button" className={LINK_CLASS} onClick={onClick}>
      {children}
    </button>
  )
}
