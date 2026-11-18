// The side menu: the logo and name, the app's pages, and at the bottom How it works and the way back to the welcome page. See docs/UI.md.
import logo from '../../../../../resources/icon.png'
import { MENU_FOOTER_ITEMS, MENU_ITEMS } from '../../constants/navigation-constants'
import type { MenuItem, Page } from '../../types/navigation-types'
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
  const items = (list: MenuItem[]): React.JSX.Element[] =>
    list.map(({ page, label }) => (
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
    ))
  return (
    <nav
      aria-label="Main menu"
      className="flex w-64 shrink-0 flex-col border-r border-line bg-surface py-6"
    >
      <div className="mb-6 flex items-center gap-3 px-4">
        <img src={logo} alt="" className="size-12 shrink-0 rounded-lg dark:invert" />
        <p className="text-2xl font-semibold">MouseBucket</p>
      </div>
      <ul className="space-y-1 px-2">{items(MENU_ITEMS)}</ul>
      <ul className="mt-auto space-y-1 px-2">
        {items(MENU_FOOTER_ITEMS)}
        <li>
          <button
            type="button"
            className={`${MENU_ITEM_CLASS} text-muted hover:bg-hover hover:text-ink`}
            onClick={onShowWelcome}
          >
            Show welcome page again
          </button>
        </li>
      </ul>
    </nav>
  )
}
