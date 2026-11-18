// Shows the system's file dialogs and main's own questions, in front of the window they belong to. See docs/SECURITY.md.
import {
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  type SaveDialogOptions,
  type WebContents
} from 'electron'
import { QUIT_BUTTON, QUIT_DIALOG } from '../constants/dialog-constants'

export class DialogService {
  // The chosen files' paths; none when the picker was cancelled.
  async chooseFiles(sender: WebContents, title: string): Promise<string[]> {
    const options: OpenDialogOptions = { title, properties: ['openFile', 'multiSelections'] }
    const window = BrowserWindow.fromWebContents(sender)
    const result =
      window === null
        ? await dialog.showOpenDialog(options)
        : await dialog.showOpenDialog(window, options)
    return result.canceled ? [] : result.filePaths
  }

  // The chosen path; null when the dialog was cancelled.
  async chooseSavePath(
    sender: WebContents,
    title: string,
    defaultPath: string
  ): Promise<string | null> {
    const options: SaveDialogOptions = { title, defaultPath }
    const window = BrowserWindow.fromWebContents(sender)
    const result =
      window === null
        ? await dialog.showSaveDialog(options)
        : await dialog.showSaveDialog(window, options)
    return result.canceled ? null : result.filePath
  }

  // Whether to quit although transfers are pending. Synchronous, because the window is closing.
  confirmQuit(window: BrowserWindow): boolean {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      ...QUIT_DIALOG,
      defaultId: 0,
      cancelId: 0
    })
    return choice === QUIT_BUTTON
  }
}
