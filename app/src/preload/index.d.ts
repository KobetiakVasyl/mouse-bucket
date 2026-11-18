import type { Api } from '../shared/types/ipc-types'

declare global {
  interface Window {
    api: Api
  }
}

export {}
