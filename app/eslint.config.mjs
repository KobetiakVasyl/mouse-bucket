import { builtinModules } from 'node:module'
import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintReact from '@eslint-react/eslint-plugin'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'

// Keeps each part of src/ inside its boundaries. See docs/ARCHITECTURE.md.
const nodeModules = builtinModules.flatMap((name) =>
  name.startsWith('node:') ? [name] : [name, `node:${name}`]
)
const noElectronOrNode = {
  paths: ['electron', ...nodeModules].map((name) => ({
    name,
    message: 'The renderer and shared code never import electron or Node modules.'
  })),
  patterns: [
    {
      group: ['electron/*', '@electron-toolkit/*'],
      message: 'The renderer and shared code never import electron or Node modules.'
    }
  ]
}
// Icons come only through src/renderer/src/theme/components/icons, which wraps Phosphor.
const noPhosphorOutsideIcons = {
  ...noElectronOrNode,
  paths: [
    ...noElectronOrNode.paths,
    {
      name: '@phosphor-icons/react',
      message: 'Use the icons in src/renderer/src/theme/components/icons.'
    }
  ]
}
const noIpcRenderer = {
  paths: [
    {
      name: 'electron',
      importNames: ['ipcRenderer'],
      message: 'Only src/preload uses ipcRenderer.'
    }
  ]
}

export default defineConfig(
  { ignores: ['**/node_modules', '**/dist', '**/out', 'data'] },
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' }
  },
  // React lives only in the renderer; elsewhere, names like Playwright's `use` aren't hooks.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ...eslintReact.configs['recommended-typescript']
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks
    },
    rules: eslintPluginReactHooks.configs.recommended.rules
  },
  {
    files: ['src/main/**'],
    rules: { 'no-restricted-imports': ['error', noIpcRenderer] }
  },
  {
    files: ['src/renderer/**', 'src/shared/**'],
    rules: { 'no-restricted-imports': ['error', noPhosphorOutsideIcons] }
  },
  {
    files: ['src/renderer/src/theme/components/icons/**'],
    rules: { 'no-restricted-imports': ['error', noElectronOrNode] }
  },
  // CommonJS files, such as the e2e window script Electron loads with -r, can only use require.
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  },
  {
    files: ['**/*.mjs'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  },
  eslintConfigPrettier
)
