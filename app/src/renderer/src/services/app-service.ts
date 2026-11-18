// The app's status from main, copying text through main, and the load state the launch check reads from <html>. See
// docs/ENVIRONMENTS.md.
import type { Api, AppStatus } from '../../../shared/types/ipc-types'
import type { LoadState } from '../types/app-types'

export class AppService {
  constructor(
    private readonly api: Pick<Api, 'getStatus' | 'copyText'>,
    private readonly root: HTMLElement
  ) {}

  status(): Promise<AppStatus> {
    return this.api.getStatus()
  }

  // The page may not write to the clipboard itself, since the window denies every permission, so main does.
  copy(text: string): Promise<void> {
    return this.api.copyText(text)
  }

  // The launch check waits for 'ready' to know the page loaded its data from main.
  markLoaded(state: LoadState): void {
    this.root.dataset.state = state
  }
}

export const appService = new AppService(window.api, document.documentElement)
