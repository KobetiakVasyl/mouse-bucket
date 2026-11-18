// Loaded into the app's main process by the e2e fixture, with Electron's -r. See docs/ARCHITECTURE.md.
// Keeps test windows off the desktop: transparent, off the taskbar and the screen, never focused or maximized.
// They're still shown, so the page renders and animates as usual.
const { app } = require('electron')

app.on('browser-window-created', (_event, window) => {
  window.setOpacity(0)
  window.setSkipTaskbar(true)
  window.setPosition(-20000, -20000)
  window.maximize = () => undefined
  window.focus = () => undefined
  window.show = () => window.showInactive()
})
