// Remembers the window's size, position and maximized state in window-state.json. See docs/UI.md.
import type { WindowState } from '../types/window-types'
import { parseJson, readIfExists, toJsonFile, writeAtomicallySync } from '../utils/file-utils'
import { WindowStateSchema } from '../validation/data-file-validation'

export class WindowStateService {
  constructor(private readonly path: string) {}

  // null when nothing usable is saved.
  async load(): Promise<WindowState | null> {
    const raw = await readIfExists(this.path)
    if (raw === undefined) return null
    const parsed = WindowStateSchema.safeParse(parseJson(raw.toString('utf8')))
    return parsed.success ? parsed.data : null
  }

  // Synchronous, because it runs while the window closes and the app is about to quit.
  saveSync(state: WindowState): void {
    writeAtomicallySync(this.path, toJsonFile(state))
  }
}
