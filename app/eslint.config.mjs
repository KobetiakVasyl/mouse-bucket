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
    ...eslintReact.configs['recommended-typescript']
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    files: ['src/main/**'],
    rules: { 'no-restricted-imports': ['error', noIpcRenderer] }
  },
  {
    files: ['src/renderer/**', 'src/shared/**'],
    ignores: ['**/*.test.ts'],
    rules: { 'no-restricted-imports': ['error', noElectronOrNode] }
  },
  {
    files: ['**/*.mjs'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  },
  eslintConfigPrettier
)
