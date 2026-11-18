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
| Preload | `app/src/preload/` | The `contextBridge` `api` object, one typed method per IPC channel. The only user of `ipcRenderer`. | Expose `ipcRenderer` or a generic send/invoke |
| Main | `app/src/main/` | Every side effect: settings, templates and keys on disk, file dialogs, S3 and the transfer queue | Trust anything the renderer sends |
| Shared | `app/src/shared/` | The IPC contract and pure helpers used by the others | Contain side effects |

ESLint enforces the import boundaries (`no-restricted-imports` in `app/eslint.config.mjs`): code in `renderer/` and `shared/` can't import `electron` or Node's built-in modules, and code in `main/` can't import `ipcRenderer`. Test files are exempt, because they run in Node and never ship.

Electron-specific code stays out of the renderer, so that moving to Tauri later only means rewriting the main-process code.

## Layout

```
LICENSE, README.md, CLAUDE.md
.editorconfig, .gitignore, .gitattributes, .node-version
.env.example               template for .env.staging and .env.production (gitignored)
.cache/                    download caches and temporary files (gitignored)
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
    shared/channels.ts     IPC channel names and the result envelope
    shared/ipc.ts          the IPC contract: payload schemas, Requests, Responses and the Api type
    shared/s3-location.ts  parses a template's S3 location
    shared/storage.ts      the upload settings, and names for storage classes
    shared/theme.ts        the window background for each theme
    main/index.ts          app lifecycle, the window, and wiring the services together
    main/ipc/              guard.ts (sender and payload checks), register.ts (one handler per channel)
    main/settings.ts       settings.json
    main/templates.ts      templates.json and the encrypted credentials.bin
    main/key-vault.ts      OS encryption through safeStorage
    main/s3/               client and region discovery, folder listing, upload, download, delete and restore
    main/transfers.ts      the transfer queue
    main/keep-awake.ts     keeps the computer from sleeping during transfers
    main/errors.ts         safe error messages for the renderer
    main/file-names.ts     safe default names for the Save dialog
    main/window.ts         the main window's options
    main/window-state.ts   where the window opens, and window-state.json
    main/environment.ts    staging or production, and what differs by it
    main/launch-check.ts   the --launch-check switch CI uses
    main/testing/          test helpers
    preload/index.ts       contextBridge: window.api
    preload/index.d.ts     the type of window.api, from shared/ipc.ts
    renderer/              index.html, src/ (main.tsx, App.tsx, navigation.ts, template-order.ts, pages/,
                           components/, styles/, assets/fonts/)
```

## IPC

The renderer calls main with `ipcRenderer.invoke` through the preload, one channel per action. `app/src/shared/ipc.ts` is the contract:

- `Requests` and `Responses` name each channel's payload and result.
- `requests` holds the zod schema that main checks each payload against. Its type ties every schema to its entry in `Requests`, so the schemas and the types can't drift apart.
- `Api` is the shape of `window.api`.

To change a channel, change `app/src/shared/ipc.ts` first, so a mismatch fails to compile on every side.

Every result travels in an envelope: `{ ok: true, value }` or `{ ok: false, error }`. The preload turns a failed one back into a thrown `Error` with a message that's safe to show.

| Channel | Payload | Returns |
|---|---|---|
| `app:status` | none | whether OS encryption is available for keys |
| `settings:get`, `settings:update` | none, or the settings to change | the settings |
| `templates:list` | none | the templates, without keys |
| `templates:create` | name, type, S3 location, and either keys or the ID of a template to copy them from | the new template |
| `templates:delete` | template ID | nothing |
| `upload:chooseFiles` | upload template ID | how many files main queued after its file picker closed |
| `download:list` | download template ID, folder prefix, continuation token | one page of subfolders, and of files with their storage class and restore state |
| `download:file` | download template ID, S3 key | whether main queued it after its Save dialog closed |
| `download:delete` | download template ID, S3 key | nothing, once S3 deleted the file |
| `download:restore` | download template ID, S3 key, speed (Standard or Bulk), days | nothing, once S3 accepted the restore |
| `transfers:list`, `transfers:cancel` | none, or a transfer ID | the transfers, or nothing |

Main also sends `transfers:changed`, with the full transfer list, whenever a transfer changes. Progress reaches it at most every 200 ms.

## Templates

A template is a named S3 location plus the IAM keys that reach it:

- **Upload templates** point at a folder (a key prefix) or a whole bucket. Uploaded files keep their names, so a file's key is the folder plus its name, and an existing object with that key is replaced.
- **Download templates** point at a whole bucket, which the Download page browses one folder level at a time.

Names are unique, ignoring case. When a template is added, main finds the bucket's region with a `HeadBucket` request. S3 reports the region even when the keys may not list the bucket, so keys that can only upload work too.

A new template can reuse another template's IAM user: main copies the keys from that template's entry in `credentials.bin`, so they never reach the page.

## Transfers

- Main runs uploads and downloads from a queue, three at a time, and each keeps going while the window is minimized.
- Uploads use `@aws-sdk/lib-storage`. Files are sent in 8 MiB parts, or larger parts for files over about 78 GiB, so no file needs more than S3's 10,000 parts. A failed or cancelled upload aborts its multipart upload.
- Every upload uses the same settings (`app/src/shared/storage.ts`):
  - Storage class Glacier Deep Archive (`DEEP_ARCHIVE`).
  - A CRC64NVME checksum, for each part and for the whole file, which S3 checks on arrival. `lib-storage` sends CRC64NVME part checksums from version 3.1170.0.
  - No encryption header, so the bucket's default encryption applies.
  - No tags and no metadata yet.
- The app never changes a bucket's versioning. On a bucket with versioning off, an upload replaces an object with the same key.
- Downloads stream into `<file>.part` next to the chosen file, which replaces the chosen file only once complete. A failed or cancelled download deletes the `.part` file.
- While any transfer is waiting or running, the computer doesn't go to sleep (`powerSaveBlocker` with `prevent-app-suspension`). The screen may still turn off.

## Archived files and deleting

- Files in Glacier Flexible Retrieval or Glacier Deep Archive can't be downloaded until they're restored. Listings ask S3 for each file's restore status (`OptionalObjectAttributes: RestoreStatus`), and main reports each file as available, archived, restoring, or restored until a date (`app/src/main/s3/list.ts`).
- A restore (`RestoreObject`) makes a temporary copy for the chosen number of days, at Standard or Bulk speed. Deep Archive usually takes up to 12 hours at Standard and 48 at Bulk.
- Delete (`DeleteObject`) removes one file by its key, after the page asked for confirmation. On a bucket with versioning on, S3 keeps older versions.
- Download templates need `s3:ListBucket`, `s3:GetObject`, `s3:RestoreObject` and `s3:DeleteObject`. Upload templates need `s3:PutObject` and `s3:AbortMultipartUpload`.

## Stack

- Electron 45, scaffolded with electron-vite's `react-ts` template.
- React and TypeScript in strict mode.
- Tailwind CSS (see [UI.md](UI.md)).
- `@aws-sdk/client-s3` and `@aws-sdk/lib-storage`, in main only.
- zod for the IPC payload schemas.
- electron-builder for installers (see [PACKAGING.md](PACKAGING.md)).
- Vitest, with `aws-sdk-client-mock` for S3, ESLint (with typescript-eslint and the React plugins) and Prettier.
