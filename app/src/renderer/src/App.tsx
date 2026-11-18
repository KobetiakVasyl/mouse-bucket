// The app shell: the first data load from main, the side menu, the pages and the welcome page. See docs/UI.md.
import { useEffect, useState } from 'react'
import type { AppStatus, Settings, SettingsUpdate, Template } from '../../shared/ipc'
import { api, messageOf } from './api'
import { SideMenu } from './components/SideMenu'
import { useTransfers } from './components/TransferList'
import { type Page, pageToShow } from './navigation'
import { DownloadPage } from './pages/DownloadPage'
import { HomePage } from './pages/HomePage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { SettingsPage } from './pages/SettingsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { UploadPage } from './pages/UploadPage'
import { WelcomePage } from './pages/WelcomePage'
import { applyTheme } from './theme'

interface AppData {
  status: AppStatus
  settings: Settings
  templates: Template[]
}

type Load =
  { state: 'loading' } | { state: 'ready'; data: AppData } | { state: 'failed'; error: string }

// The launch check reads this state to know the page loaded its data from main. See docs/ENVIRONMENTS.md.
function markState(state: 'ready' | 'failed'): void {
  document.documentElement.dataset.state = state
}

export default function App(): React.JSX.Element {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [page, setPage] = useState<Page>('home')
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const transfers = useTransfers()

  useEffect(() => {
    Promise.all([api.getStatus(), api.getSettings(), api.listTemplates()]).then(
      ([status, settings, templates]) => {
        setLoad({ state: 'ready', data: { status, settings, templates } })
        setWelcomeOpen(!settings.welcomeSeen)
        markState('ready')
      },
      (reason: unknown) => {
        setLoad({ state: 'failed', error: messageOf(reason) })
        markState('failed')
      }
    )
  }, [])

  if (load.state === 'loading') return <p className="p-8 text-muted">Loading…</p>
  if (load.state === 'failed') {
    return (
      <p role="alert" className="p-8">
        MouseBucket couldn&apos;t start: {load.error}
      </p>
    )
  }

  const { status, settings, templates } = load.data
  const changeData = (change: (data: AppData) => AppData): void =>
    setLoad((previous) =>
      previous.state === 'ready' ? { state: 'ready', data: change(previous.data) } : previous
    )

  const updateSettings = async (update: SettingsUpdate): Promise<void> => {
    const next = await api.updateSettings(update)
    applyTheme(next.theme)
    changeData((data) => ({ ...data, settings: next }))
  }

  // If saving fails, the welcome page simply shows again on the next start.
  const closeWelcome = (): void => {
    setWelcomeOpen(false)
    if (!settings.welcomeSeen) updateSettings({ welcomeSeen: true }).catch(() => undefined)
  }

  const shown = pageToShow(page, templates)
  const ofKind = (kind: Template['kind']): Template[] =>
    templates.filter((template) => template.kind === kind)

  const pages: Record<Page, () => React.JSX.Element> = {
    home: () => <HomePage templates={templates} transfers={transfers} onNavigate={setPage} />,
    upload: () => <UploadPage templates={ofKind('upload')} transfers={transfers} />,
    download: () => <DownloadPage templates={ofKind('download')} transfers={transfers} />,
    templates: () => (
      <TemplatesPage
        templates={templates}
        encryptionAvailable={status.encryptionAvailable}
        firstRun={templates.length === 0}
        onCreated={(template) => {
          changeData((data) => ({ ...data, templates: [...data.templates, template] }))
          if (templates.length === 0) setPage('home')
        }}
        onDeleted={(id) =>
          changeData((data) => ({
            ...data,
            templates: data.templates.filter((template) => template.id !== id)
          }))
        }
      />
    ),
    'how-it-works': () => <HowItWorksPage />,
    settings: () => <SettingsPage settings={settings} onChange={updateSettings} />
  }

  return (
    <div className="flex h-screen">
      <SideMenu current={shown} onNavigate={setPage} onShowWelcome={() => setWelcomeOpen(true)} />
      <main className="min-w-0 flex-1 overflow-y-auto p-8">{pages[shown]()}</main>
      {welcomeOpen && (
        <WelcomePage
          onClose={closeWelcome}
          onShowHowItWorks={() => {
            closeWelcome()
            setPage('how-it-works')
          }}
        />
      )}
    </div>
  )
}
