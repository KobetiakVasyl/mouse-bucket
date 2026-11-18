// The side menu: the app's pages and the way back to the welcome page. See docs/UI.md.
import { menuPageOf, type Page } from '../navigation'

const ITEMS: { page: Page; label: string }[] = [
  { page: 'home', label: 'Home' },
  { page: 'templates', label: 'Templates' },
  { page: 'how-it-works', label: 'How it works' },
  { page: 'settings', label: 'Settings' }
]

const ITEM_CLASS =
  'block w-full rounded-lg px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

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
    <nav className="flex w-56 shrink-0 flex-col border-r border-line bg-surface py-6">
      <p className="mb-6 px-5 text-2xl font-semibold">MouseBucket</p>
      <ul className="space-y-1 px-2">
        {ITEMS.map(({ page, label }) => (
          <li key={page}>
            <button
              type="button"
              aria-current={page === marked ? 'page' : undefined}
              className={`${ITEM_CLASS} ${page === marked ? 'bg-ink text-paper' : 'hover:bg-hover'}`}
              onClick={() => onNavigate(page)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${ITEM_CLASS} mx-2 mt-auto w-auto text-muted hover:bg-hover hover:text-ink`}
        onClick={onShowWelcome}
      >
        Show welcome page again
      </button>
    </nav>
  )
}
