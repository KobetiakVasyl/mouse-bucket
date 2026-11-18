import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { thirdPartyNotices } from './vite-plugins/third-party-notices'

// Env files live at the repo root, and each bundle reads only its own prefix. See docs/ENVIRONMENTS.md.
const envDir = resolve('..')

// The hot-reload server needs a WebSocket and inline styles; builds keep the strict CSP. See docs/SECURITY.md.
const hotReloadCsp: Plugin = {
  name: 'hot-reload-csp',
  apply: 'serve',
  transformIndexHtml: (html) => {
    const replacements: [string, string][] = [
      ["style-src 'self'", "style-src 'self' 'unsafe-inline'"],
      ["connect-src 'none'", "connect-src 'self' ws://localhost:*"]
    ]
    return replacements.reduce((page, [from, to]) => {
      if (!page.includes(from)) throw new Error(`hot-reload-csp: "${from}" is missing from the CSP`)
      return page.replace(from, to)
    }, html)
  }
}

export default defineConfig({
  main: { envDir, envPrefix: 'MAIN_VITE_', plugins: [thirdPartyNotices()] },
  preload: { envDir, envPrefix: 'PRELOAD_VITE_', plugins: [thirdPartyNotices()] },
  renderer: {
    envDir,
    envPrefix: 'RENDERER_VITE_',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      react(),
      tailwindcss(),
      hotReloadCsp,
      thirdPartyNotices({
        required: true,
        assets: [
          {
            title: 'Montserrat font 5.3.0 (OFL-1.1)',
            licenseFile: resolve('src/renderer/src/assets/fonts/montserrat/OFL.txt')
          }
        ]
      })
    ]
  }
})
