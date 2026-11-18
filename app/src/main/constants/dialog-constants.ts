// The texts of main's own dialogs. See docs/UI.md.
export const SAVE_DIALOG_TITLE = 'Save the downloaded file'

export const QUIT_DIALOG = {
  buttons: ['Keep transferring', 'Quit and cancel them'],
  message: 'Uploads or downloads are still running.',
  detail: "Quitting cancels every transfer that hasn't finished."
}

// The index of the quit button in QUIT_DIALOG.buttons.
export const QUIT_BUTTON = 1
