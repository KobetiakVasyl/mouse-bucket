// The renderer's entry: paints the saved theme at once, then renders the app. See docs/UI.md.
import './theme/styles/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { themeService } from './services/theme-service'

themeService.apply(themeService.fromQuery(window.location.search))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
