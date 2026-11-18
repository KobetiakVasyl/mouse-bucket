// Shows the system's file and folder pickers and main's own questions, in front of the window they belong to. See docs/SECURITY.md.
import {
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  type OpenDialogReturnValue,
  type WebContents
} from 'electron'
import { QUIT_BUTTON, QUIT_DIALOG } from '../constants/dialog-constants'

export class DialogService {
  // The chosen files' paths; none when the picker was cancelled.
  async chooseFiles(sender: WebContents, title: string): Promise<string[]> {
    const result = await this.open(sender, { title, properties: ['openFile', 'multiSelections'] })
    return result.canceled ? [] : result.filePaths
  }

  // The chosen folder's path; null when the picker was cancelled.
  async chooseFolder(
    sender: WebContents,
    title: string,
    defaultPath?: string
  ): Promise<string | null> {
    const result = await this.open(sender, {
      title,
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
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

  private open(sender: WebContents, options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
    const window = BrowserWindow.fromWebContents(sender)
    return window === null ? dialog.showOpenDialog(options) : dialog.showOpenDialog(window, options)
  }
}
