// The app shell: the splash screen during the first data load from main, the side menu, the pages, the updates dialog
// and the welcome page. See docs/UI.md.
import { useEffect, useState } from 'react'
import type { SettingsUpdate } from '../../shared/types/settings-types'
import { SPLASH_MS } from './constants/app-constants'
import { DownloadPage } from './pages/DownloadPage'
import { HomePage } from './pages/HomePage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { SettingsPage } from './pages/SettingsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { UploadPage } from './pages/UploadPage'
import { WelcomePage } from './pages/WelcomePage'
import { appService } from './services/app-service'
import { settingsService } from './services/settings-service'
import { templateService } from './services/template-service'
import { themeService } from './services/theme-service'
import { useTransfers } from './services/transfer-service'
import { SideMenu } from './theme/compositions/SideMenu'
import { SplashScreen } from './theme/compositions/SplashScreen'
import { UpdatesDialog } from './theme/compositions/UpdatesDialog'
import type { AppData, AppLoad } from './types/app-types'
import type { Page } from './types/navigation-types'
import type { TemplateFormValues } from './types/template-form-types'
import { messageOf } from './utils/error-utils'
import { pageToShow } from './utils/navigation-utils'
import { templatesOfKind } from './utils/template-utils'

export default function App(): React.JSX.Element {
  const [load, setLoad] = useState<AppLoad>({ state: 'loading' })
  const [page, setPage] = useState<Page>('home')
  // A new template Browse started for a folder; it's dropped as soon as the user goes anywhere else.
  const [draft, setDraft] = useState<TemplateFormValues | null>(null)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  const [splashOver, setSplashOver] = useState(false)
  const transfers = useTransfers()

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashOver(true), SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    Promise.all([appService.status(), settingsService.get(), templateService.list()]).then(
      ([status, settings, templates]) => {
        setLoad({ state: 'ready', data: { status, settings, templates } })
        themeService.apply(settings.theme)
        setWelcomeOpen(!settings.welcomeSeen)
        appService.markLoaded('ready')
      },
      (reason: unknown) => {
        setLoad({ state: 'failed', error: messageOf(reason) })
        appService.markLoaded('failed')
      }
    )
  }, [])

  if (!splashOver || load.state === 'loading') return <SplashScreen />
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
    const next = await settingsService.update(update)
    themeService.apply(next.theme)
    changeData((data) => ({ ...data, settings: next }))
  }

  // If saving fails, the welcome page simply shows again on the next start.
  const closeWelcome = (): void => {
    setWelcomeOpen(false)
    if (!settings.welcomeSeen) updateSettings({ welcomeSeen: true }).catch(() => undefined)
  }

  const navigate = (next: Page): void => {
    setDraft(null)
    setPage(next)
  }

  const shown = pageToShow(page, templates)

  const pages: Record<Page, () => React.JSX.Element> = {
    home: () => <HomePage templates={templates} transfers={transfers} onNavigate={navigate} />,
    upload: () => (
      <UploadPage
        templates={templatesOfKind(templates, 'upload')}
        transfers={transfers}
        defaultStorageClass={settings.defaultStorageClass}
        defaultAccessTier={settings.defaultAccessTier}
      />
    ),
    download: () => (
      <DownloadPage
        templates={templatesOfKind(templates, 'download')}
        transfers={transfers}
        restoreDefaults={{ tier: settings.defaultRestoreTier, days: settings.defaultRestoreDays }}
        onNewUploadTemplate={(next) => {
          setDraft(next)
          setPage('templates')
        }}
      />
    ),
    templates: () => (
      <TemplatesPage
        templates={templates}
        encryptionAvailable={status.encryptionAvailable}
        firstRun={templates.length === 0}
        draft={draft}
        onCreated={(template) => {
          changeData((data) => ({ ...data, templates: [...data.templates, template] }))
          setDraft(null)
          if (templates.length === 0) navigate('home')
        }}
        onUpdated={(template) =>
          changeData((data) => ({
            ...data,
            templates: data.templates.map((existing) =>
              existing.id === template.id ? template : existing
            )
          }))
        }
        onDeleted={(id) =>
          changeData((data) => ({
            ...data,
            templates: data.templates.filter((template) => template.id !== id)
          }))
        }
      />
    ),
    'how-it-works': () => <HowItWorksPage />,
    settings: () => (
      <SettingsPage
        settings={settings}
        onChange={updateSettings}
        onChooseDownloadFolder={async () => {
          const next = await settingsService.chooseDownloadFolder()
          changeData((data) => ({ ...data, settings: next }))
        }}
      />
    )
  }

  return (
    <div className="flex h-screen">
      <SideMenu
        current={shown}
        onNavigate={navigate}
        onCheckForUpdates={() => setUpdatesOpen(true)}
        onShowWelcome={() => setWelcomeOpen(true)}
      />
      <main className="min-w-0 flex-1 overflow-y-auto p-8">{pages[shown]()}</main>
      {updatesOpen && (
        <UpdatesDialog version={status.version} onClose={() => setUpdatesOpen(false)} />
      )}
      {welcomeOpen && (
        <WelcomePage
          onClose={closeWelcome}
          onShowHowItWorks={() => {
            closeWelcome()
            navigate('how-it-works')
          }}
        />
      )}
    </div>
  )
}
