// Starts the built app for each end-to-end test, in a throwaway folder of its own and with sample S3 data. See docs/ARCHITECTURE.md.
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
  test as base
} from '@playwright/test'
import type { Settings } from '../../../src/shared/types/settings-types'
import type { Template } from '../../../src/shared/types/template-types'
import { appPath, repoPath } from '../../support/paths'
import { installSampleStorage, SAMPLE } from './sample-storage'

export interface AppSetup {
  templates: Template[]
  settings: Partial<Settings>
}

const MAIN = appPath('out/main/index.js')
const QUIET_WINDOW = appPath('tests/e2e/support/quiet-window.cjs')
const RUNS = repoPath('.cache/tmp/e2e/')
// The app's own version, so each test copy reports it as the installed app would.
const VERSION: unknown = JSON.parse(readFileSync(appPath('package.json'), 'utf8')).version

export function uploadTemplate(name: string, prefix = `${name.toLowerCase()}/`): Template {
  return {
    id: randomUUID(),
    name,
    kind: 'upload',
    platform: 's3',
    bucket: 'example-bucket',
    prefix,
    region: 'eu-west-1'
  }
}

export function downloadTemplate(name: string, bucket = 'example-archive'): Template {
  return {
    id: randomUUID(),
    name,
    kind: 'download',
    platform: 's3',
    bucket,
    prefix: '',
    region: 'eu-west-1'
  }
}

export function azureTemplate(name: string, kind: Template['kind'] = 'download'): Template {
  return {
    id: randomUUID(),
    name,
    kind,
    platform: 'azure',
    account: 'exampleaccount',
    container: 'backups',
    prefix: kind === 'upload' ? 'photos/' : ''
  }
}

export function driveTemplate(name: string, kind: Template['kind'] = 'download'): Template {
  return {
    id: randomUUID(),
    name,
    kind,
    platform: 'google-drive',
    folderId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345',
    folderName: 'Family photos'
  }
}

export const test = base.extend<{ setup: AppSetup; app: ElectronApplication; page: Page }>({
  setup: [{ templates: [], settings: { welcomeSeen: true } }, { option: true }],

  app: async ({ setup }, use) => {
    // Without a build, Electron would show an error dialog on the desktop instead of failing the test.
    if (!existsSync(MAIN))
      throw new Error("The app isn't built. Run the tests with npm run test:e2e.")
    await mkdir(RUNS, { recursive: true })
    const root = await mkdtemp(join(RUNS, 'run-'))
    // The app's folder decides its data folder, so this keeps tests away from app/data/ and its real keys.
    const main = relative(root, MAIN).replace(/\\/g, '/')
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'mousebucket-e2e', version: VERSION, main })
    )
    const dataDir = join(root, 'data', 'staging')
    await mkdir(dataDir, { recursive: true })
    await writeFile(join(dataDir, 'templates.json'), JSON.stringify(setup.templates))
    await writeFile(join(dataDir, 'settings.json'), JSON.stringify(setup.settings))

    // VS Code's terminals set ELECTRON_RUN_AS_NODE, which would start Electron as plain Node.
    const env: Record<string, string> = {}
    for (const [name, value] of Object.entries(process.env)) {
      if (value !== undefined && name !== 'ELECTRON_RUN_AS_NODE') env[name] = value
    }
    // Electron's -r loads the script before the app, so the test windows stay off the desktop.
    const app = await electron.launch({ args: ['-r', QUIET_WINDOW, root], env })
    // Main registers its handlers before it opens the window, so swapping them earlier would race.
    await app.firstWindow()
    await app.evaluate(installSampleStorage, SAMPLE)
    await use(app)
    await app.close()
    await rm(root, { recursive: true, force: true })
  },

  page: async ({ app }, use) => {
    const page = await app.firstWindow()
    await page.waitForFunction(() => document.documentElement.dataset.state === 'ready')
    await use(page)
  }
})

// An item of the side menu, such as 'Templates'.
export function menuItem(page: Page, name: string): ReturnType<Page['getByRole']> {
  return page.getByRole('navigation', { name: 'Main menu' }).getByRole('button', { name })
}

// Opens Upload or Browse through its tile on Home.
export async function openFromHome(page: Page, tile: 'Upload' | 'Browse'): Promise<void> {
  await menuItem(page, 'Home').click()
  await page.getByRole('button', { name: new RegExp(`^${tile}`) }).click()
}

export { expect } from '@playwright/test'
