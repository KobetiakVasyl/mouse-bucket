// The main window's place on screen, as saved in window-state.json, and what its options are built from. See docs/UI.md.
import type { z } from 'zod'
import type { Theme } from '../../shared/types/settings-types'
import type { DialogService } from '../services/dialog-service'
import type { EnvironmentService } from '../services/environment-service'
import type { LaunchCheckService } from '../services/launch-check-service'
import type { TransferService } from '../services/transfer-service'
import type { WindowStateService } from '../services/window-state-service'
import type { BoundsSchema, WindowStateSchema } from '../validation/data-file-validation'

export type Bounds = z.infer<typeof BoundsSchema>
export type WindowState = z.infer<typeof WindowStateSchema>

export interface Placement {
  // null opens the window at its default size, centered.
  bounds: Bounds | null
  maximized: boolean
}

export interface MainWindowInputs {
  environment: Pick<EnvironmentService, 'windowTitle' | 'devToolsAllowed'>
  platform: string
  preloadPath: string
  icon: string
  theme: Theme
  bounds: Bounds | null
}

// The page the window loads: the hot-reload server's URL in staging runs from source, otherwise the built file.
export interface PageSource {
  url: string | null
  file: string
}

export interface WindowServiceOptions {
  environment: Pick<EnvironmentService, 'windowTitle' | 'devToolsAllowed'>
  page: PageSource
  preloadPath: string
  icon: string
  transfers: Pick<TransferService, 'active' | 'pauseAll'>
  windowState: Pick<WindowStateService, 'saveSync'>
  dialogs: Pick<DialogService, 'confirmQuit'>
  // Set only when the app was started with --launch-check.
  launchCheck: Pick<LaunchCheckService, 'watch'> | null
}
