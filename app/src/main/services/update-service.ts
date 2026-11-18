// Checks GitHub Releases for a newer version only when asked, downloads it when asked, and installs it on restart. See docs/PACKAGING.md.
import type { UpdateState } from '../../shared/types/update-types'
import type { Updater } from '../types/update-types'
import { describeUpdateError } from '../utils/update-utils'

export class UpdateService {
  private state: UpdateState

  // updater is null where the app can't update itself, such as when it runs from source. Staging allows pre-releases,
  // and its versions, such as 0.2.0-staging.17, make it follow only staging's own.
  constructor(
    private readonly updater: Updater | null,
    allowPrerelease: boolean,
    private readonly onChange: (state: UpdateState) => void
  ) {
    this.state = updater === null ? { status: 'unsupported' } : { status: 'idle' }
    if (updater === null) return
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.allowPrerelease = allowPrerelease
    updater.on('update-available', (info) =>
      this.set({ status: 'available', version: info.version })
    )
    updater.on('update-not-available', () => this.set({ status: 'current' }))
    updater.on('download-progress', (progress) => {
      if (this.state.status === 'downloading') {
        this.set({ ...this.state, percent: Math.floor(progress.percent) })
      }
    })
    updater.on('update-downloaded', (info) => this.set({ status: 'ready', version: info.version }))
    updater.on('error', (error) =>
      this.set({ status: 'failed', error: describeUpdateError(error) })
    )
  }

  get status(): UpdateState {
    return this.state
  }

  async check(): Promise<UpdateState> {
    if (this.updater === null || this.busy()) return this.state
    this.set({ status: 'checking' })
    try {
      await this.updater.checkForUpdates()
    } catch (error) {
      this.set({ status: 'failed', error: describeUpdateError(error) })
    }
    return this.state
  }

  async download(): Promise<void> {
    if (this.updater === null || this.state.status !== 'available') return
    this.set({ status: 'downloading', version: this.state.version, percent: 0 })
    try {
      await this.updater.downloadUpdate()
    } catch (error) {
      this.set({ status: 'failed', error: describeUpdateError(error) })
    }
  }

  // Quits the app, which asks first while transfers are running, and starts the downloaded installer.
  install(): void {
    if (this.updater !== null && this.state.status === 'ready') this.updater.quitAndInstall()
  }

  private busy(): boolean {
    return this.state.status === 'checking' || this.state.status === 'downloading'
  }

  private set(state: UpdateState): void {
    this.state = state
    this.onChange(state)
  }
}
