// The app's status from main, and the load state the launch check reads from <html>. See docs/ENVIRONMENTS.md.
import type { Api, AppStatus } from '../../../shared/types/ipc-types'
import type { LoadState } from '../types/app-types'

export class AppService {
  constructor(
    private readonly api: Pick<Api, 'getStatus'>,
    private readonly root: HTMLElement
  ) {}

  status(): Promise<AppStatus> {
    return this.api.getStatus()
  }

  // The launch check waits for 'ready' to know the page loaded its data from main.
  markLoaded(state: LoadState): void {
    this.root.dataset.state = state
  }
}

export const appService = new AppService(window.api, document.documentElement)
