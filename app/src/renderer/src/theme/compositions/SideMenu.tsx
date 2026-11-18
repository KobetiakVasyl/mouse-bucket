// The side menu: the app's pages and the way back to the welcome page. See docs/UI.md.
import { MENU_ITEMS } from '../../constants/navigation-constants'
import type { Page } from '../../types/navigation-types'
import { menuPageOf } from '../../utils/navigation-utils'
import { MENU_ITEM_CLASS } from '../styles/style-constants'

export function SideMenu({
  current,
  onNavigate,
  onShowWelcome
}: {
  current: Page
  onNavigate: (page: Page) => void
  onShowWelcome: () => void
}): React.JSX.Element {
  const marked = menuPageOf(current)
  return (
    <nav
      aria-label="Main menu"
      className="flex w-56 shrink-0 flex-col border-r border-line bg-surface py-6"
    >
      <p className="mb-6 px-5 text-2xl font-semibold">MouseBucket</p>
      <ul className="space-y-1 px-2">
        {MENU_ITEMS.map(({ page, label }) => (
          <li key={page}>
            <button
              type="button"
              aria-current={page === marked ? 'page' : undefined}
              className={`${MENU_ITEM_CLASS} ${page === marked ? 'bg-ink text-paper' : 'hover:bg-hover'}`}
              onClick={() => onNavigate(page)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${MENU_ITEM_CLASS} mx-2 mt-auto w-auto text-muted hover:bg-hover hover:text-ink`}
        onClick={onShowWelcome}
      >
        Show welcome page again
      </button>
    </nav>
  )
}
