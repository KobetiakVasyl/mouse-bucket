# Architecture

An Electron app with three processes and a shared contract layer. There is no backend: the main process talks to S3 directly over HTTPS.

```
Renderer (React, sandboxed)  <-- typed IPC via window.api -->  Main (Node)  -- HTTPS -->  S3 bucket
  no Node, no network                                           every side effect
```

## Parts

| Part | Folder | Owns | Must never |
|---|---|---|---|
| Renderer | `app/src/renderer/` | The page. Reaches main only through `window.api`. | Import `electron` or Node modules, or touch the network or the file system |
| Preload | `app/src/preload/` | The `contextBridge` `api` object. The only user of `ipcRenderer`. | Expose `ipcRenderer` or a generic send/invoke |
| Main | `app/src/main/` | Every side effect: disk, dialogs, the network and anything else outside the page | Trust anything the renderer sends |
| Shared | `app/src/shared/` | Types and the IPC channel map used by the other three | Contain side effects |

The preload currently exposes an empty `api`, and `app/src/shared/` doesn't exist yet.

ESLint enforces the import boundaries (`no-restricted-imports` in `app/eslint.config.mjs`): code in `renderer/` and `shared/` can't import `electron` or Node's built-in modules, and code in `main/` can't import `ipcRenderer`.

Electron-specific code stays out of the renderer, so that moving to Tauri later only means rewriting the main-process code.

## Suggested layout

Where things go as the app grows. Not all of it exists yet.

```
LICENSE, README.md, CLAUDE.md
.editorconfig, .gitignore, .gitattributes, .node-version
.env.example               template for .env.staging and .env.production (gitignored)
.cache/                    npm, Electron and electron-builder download caches (gitignored)
compose.yaml, docker/      Linux container (Ubuntu LTS) for checking the Linux build
.github/workflows/         CI on Linux and Windows, and security checks
.mcp.json, scripts/        Claude Code's read-only GitHub MCP server and its token helper
docs/                      one file per area (this folder)
app/                       the Electron app
  package.json, electron.vite.config.ts
  electron-builder.yml     production installers; electron-builder.staging.yml extends it for staging
  tsconfig.json            references tsconfig.node.json, tsconfig.web.json and tsconfig.scripts.json
  eslint.config.mjs, .prettierrc.yaml, .prettierignore, .npmrc
  audit-allowlist.json     reviewed npm audit advisories
  scripts/                 cache wrapper, test runner, launch check, dependency audit and actionlint
  vite-plugins/            build plugins, such as the third-party license notices
  resources/               the window icon
  build/                   the installer icon and the NSIS upgrade hook
  src/
    shared/types.ts        types shared by main, preload and renderer
    shared/ipc.ts          channel names and their zod schemas
    main/index.ts          app lifecycle, window creation, hardening
    main/window.ts         the main window's options
    main/environment.ts    staging or production, and what differs by it
    main/launch-check.ts   the --launch-check switch CI uses
    main/ipc/              one register*.ts per area
    preload/index.ts       contextBridge: window.api
    preload/index.d.ts     type of window.api, derived from shared/ipc.ts
    renderer/              index.html, src/ (main.tsx, App.tsx, api/, screens/, components/, styles/)
```

## IPC rules

- Channels are defined in `app/src/shared/ipc.ts`, with a zod schema for each request and response. The TypeScript types are inferred from the schemas, so the compile-time and runtime checks can't drift apart.
- To change a channel, change `app/src/shared/ipc.ts` first, so a mismatch fails to compile on both sides.
- Main validates every payload against its schema at runtime.

## Stack

- Electron 45, scaffolded with electron-vite's `react-ts` template.
- React and TypeScript in strict mode.
- Tailwind CSS (see [UI.md](UI.md)).
- electron-builder for installers (see [PACKAGING.md](PACKAGING.md)).
- Vitest, ESLint (with typescript-eslint and the React plugins) and Prettier.
