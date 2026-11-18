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

ESLint enforces the import boundaries (`no-restricted-imports` in `app/eslint.config.mjs`): code in `renderer/` and `shared/` can't import `electron` or Node's built-in modules, and code in `main/` can't import `ipcRenderer`.

Electron-specific code stays out of the renderer, so that moving to Tauri later only means rewriting the main-process code.

## Code organization

Inside each part, code is split into folders by kind (see [Layout](#layout) for where each part is):

| Folder | Holds | In |
|---|---|---|
| `services/` | Classes that do the work and own its side effects, such as `S3Service` or `TemplateService` | main, renderer |
| `constants/` | Every module-level constant: names, limits, messages, labels and fixed settings | main, renderer, shared |
| `types/` | Every named type and interface, including the ones inferred from a zod schema | main, renderer, shared |
| `validation/` | zod schemas, and checks of anything from outside, such as IPC payloads, the app's files or a typed-in S3 location | main, renderer, shared |
| `utils/` | Pure functions, with no side effects | main, renderer |
| `pages/` | One component per page, built from compositions | renderer |
| `theme/styles/` | `global.css`, `fonts.css`, and `style-constants.ts` with the Tailwind class strings components share | renderer |
| `theme/components/` | Basic building blocks, such as `Button`, `Field`, `ToggleGroup` and `Modal` | renderer |
| `theme/compositions/` | Pieces built from components, such as `SideMenu`, `TemplatePicker`, `TransferList` and `ConfirmDialog` | renderer |

- **Names:** a file's name ends in its kind: `s3-service.ts`, `storage-constants.ts`, `template-types.ts`, `s3-location-validation.ts`, `format-utils.ts`. React components are one per file and named after the component, such as `Button.tsx` or `DownloadPage.tsx`.
- **Constants and types:** module-level constants live only in `constants/` (and `theme/styles/style-constants.ts`), and named types only in `types/`. A component's props may stay in its signature.
- **Services:** each service is a class, created once and handed to whatever uses it. A service takes what it needs in its constructor, typed as only the methods it calls, such as `Pick<TemplateService, 'getOfKind' | 'accessFor'>`, so tests can pass small fakes.
  - Main creates all its services in `app/src/main/index.ts`. `IpcService` connects each channel to one service method behind the sender and payload checks, and holds no logic of its own.
  - In the renderer, each service wraps the part of `window.api` it needs, and its file exports one instance, such as `transferService`, plus the React hook built on it, if any, such as `useTransfers`. Pages and compositions use those instances, never `window.api` itself. The renderer's components are React function components.
- **Shared:** `app/src/shared/` holds only what at least two parts use. The validation the renderer uses, such as `parseS3Location`, has no zod, so zod stays out of the renderer's bundle.

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
  tsconfig.json            references tsconfig.node.json, tsconfig.web.json, tsconfig.scripts.json and tsconfig.tests.json
  eslint.config.mjs, .prettierrc.yaml, .prettierignore, .npmrc
  vitest.config.ts, playwright.config.ts
  audit-allowlist.json     reviewed npm audit advisories
  scripts/                 cache wrapper, test runner, launch check, dependency audit and actionlint
  vite-plugins/            build plugins, such as the third-party license notices
  resources/               the window icon
  build/                   the installer icon and the NSIS upgrade hook
  src/
    shared/                constants/, types/ and validation/ used by more than one part
    main/index.ts          starts the app and wires main's services together
    main/                  services/, constants/, types/, validation/ and utils/
    preload/index.ts       contextBridge: window.api
    preload/index.d.ts     the type of window.api, from shared/types/ipc-types.ts
    renderer/index.html    the page, with its CSP
    renderer/src/          main.tsx, App.tsx, pages/, theme/, services/, constants/, types/, utils/,
                           validation/ and assets/fonts/
  tests/                   unit/, integration/, e2e/ and support/ (see [Tests](#tests))
```

## IPC

The renderer calls main with `ipcRenderer.invoke` through the preload, one channel per action. The contract is in `app/src/shared/`:

- `constants/ipc-constants.ts` names the channels.
- `types/ipc-types.ts` has `Requests` and `Responses`, which name each channel's payload and result, the result envelope, and `Api`, the shape of `window.api`.
- `validation/ipc-validation.ts` has `REQUEST_SCHEMAS`, the zod schema main checks each payload against. Its type ties every schema to its entry in `Requests`, so the schemas and the types can't drift apart.

To change a channel, change these files first, so a mismatch fails to compile on every side.

Every result travels in an envelope: `{ ok: true, value }` or `{ ok: false, error }`. The preload turns a failed one back into a thrown `Error` with a message that's safe to show.

| Channel | Payload | Returns |
|---|---|---|
| `app:status` | none | whether OS encryption is available for keys |
| `settings:get`, `settings:update` | none, or the settings to change | the settings |
| `templates:list` | none | the templates, without keys |
| `templates:create` | name, type, S3 location, and either keys or the ID of a template to copy them from | the new template |
| `templates:delete` | template ID | nothing |
| `upload:chooseFiles` | upload template ID, and the storage class (Glacier Deep Archive or Standard) | how many files main queued after its file picker closed |
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
- Each upload is stored as Glacier Deep Archive (`DEEP_ARCHIVE`) or Standard (`STANDARD`), chosen on the Upload page. The page starts with the default from Settings, which is Glacier Deep Archive until changed.
- Apart from the storage class, every upload uses the same settings (`app/src/shared/constants/storage-constants.ts`):
  - A CRC64NVME checksum, for each part and for the whole file, which S3 checks on arrival. `lib-storage` sends CRC64NVME part checksums from version 3.1170.0.
  - No encryption header, so the bucket's default encryption applies.
  - No tags and no metadata yet.
- The app never changes a bucket's versioning. On a bucket with versioning off, an upload replaces an object with the same key.
- Downloads stream into `<file>.part` next to the chosen file, which replaces the chosen file only once complete. A failed or cancelled download deletes the `.part` file.
- While any transfer is waiting or running, the computer doesn't go to sleep (`powerSaveBlocker` with `prevent-app-suspension`). The screen may still turn off.

## Archived files and deleting

- Files in Glacier Flexible Retrieval or Glacier Deep Archive can't be downloaded until they're restored. Listings ask S3 for each file's restore status (`OptionalObjectAttributes: RestoreStatus`), and main reports each file as available, archived, restoring, or restored until a date (`app/src/main/utils/s3-utils.ts`).
- A restore (`RestoreObject`) makes a temporary copy for the chosen number of days, at Standard or Bulk speed. Deep Archive usually takes up to 12 hours at Standard and 48 at Bulk.
- Delete (`DeleteObject`) removes one file by its key, after the page asked for confirmation. On a bucket with versioning on, S3 keeps older versions.
- Download templates need `s3:ListBucket`, `s3:GetObject`, `s3:RestoreObject` and `s3:DeleteObject`. Upload templates need `s3:PutObject` and `s3:AbortMultipartUpload`. `app/src/renderer/src/constants/permission-constants.ts` holds these, with example policies, for the Templates and How it works pages.

## Tests

Tests live in `app/tests/`, apart from the code they test. There are three kinds, each in its own folder. Inside each one, the folders mirror `app/`, so a module's test sits at the same path: `app/src/main/services/s3-service.ts` is tested in `app/tests/unit/main/services/s3-service.test.ts`, and `app/scripts/audit-check.mjs` in `app/tests/unit/scripts/audit-check.test.ts`.

| Folder | Tests | Runs with | Command |
|---|---|---|---|
| `tests/unit/` | One module at a time, in memory, with S3 mocked by `aws-sdk-client-mock`. Also the checks that config files agree, such as the app's names and the Node version. | Vitest, project `unit` | `npm run test:unit` |
| `tests/integration/` | Modules working with real files in fresh temporary folders: the settings, template and window-state services, and the uploads and downloads in `S3Service` | Vitest, project `integration` | `npm run test:integration` |
| `tests/e2e/` | The built app, driven through its window the way a user would | Playwright | `npm run test:e2e` |
| `tests/support/` | Helpers for all three: paths into the repo, and temporary folders | | |

`npm test` runs the unit and integration tests. Unit and integration tests end in `.test.ts`, and end-to-end tests in `.spec.ts`. `app/tsconfig.tests.json` typechecks all of them.

### End-to-end tests

- `npm run test:e2e` builds the app in staging mode, then Playwright starts the build in `out/` with the Electron in `node_modules/`. It's the unpackaged build, because the packaged app's fuses block the debugger connection Playwright drives it through. The launch check covers the packaged app (see [ENVIRONMENTS.md](ENVIRONMENTS.md#continuous-integration)).
- Each test starts its own copy of the app, one test at a time (`app/tests/e2e/support/app.ts`). Its app folder is a fresh folder under `.cache/tmp/e2e/` with a `package.json` that points at the build. The app keeps its data next to its folder, so each test starts with only the templates and settings it seeds, and never sees `app/data/`. The folder is deleted when the test ends.
- No test reaches AWS. Once the window is open, the test swaps main's handlers for the channels that would call S3 for handlers that answer with sample data (`app/tests/e2e/support/sample-s3.ts`): `download:list`, `download:file`, `download:delete`, `download:restore`, `upload:chooseFiles` and `templates:create`. It waits for the window because main registers its own handlers before it opens the window. Everything else runs as built: the preload, the IPC checks, settings, and listing and deleting templates.

## Stack

- Electron 45, scaffolded with electron-vite's `react-ts` template.
- React and TypeScript in strict mode.
- Tailwind CSS (see [UI.md](UI.md)).
- `@aws-sdk/client-s3` and `@aws-sdk/lib-storage`, in main only.
- zod for the IPC payload schemas.
- electron-builder for installers (see [PACKAGING.md](PACKAGING.md)).
- Vitest, with `aws-sdk-client-mock` for S3, and Playwright for end-to-end tests.
- ESLint (with typescript-eslint and the React plugins) and Prettier.
