# Architecture

An Electron app with three processes and a shared contract layer. There is no backend: the main process talks directly over HTTPS to the storage platforms, Amazon S3, Azure Blob Storage and Google Drive, and to GitHub Releases only when asked to check for an update. Azure Blob Storage and Google Drive are in beta.

```
Renderer (React, sandboxed)  <-- typed IPC via window.api -->  Main (Node)  -- HTTPS -->  S3, Azure, Google Drive
  no Node, no network                                           every side effect
```

## Parts

| Part | Folder | Owns | Must never |
|---|---|---|---|
| Renderer | `app/src/renderer/` | The page. Reaches main only through `window.api`. | Import `electron` or Node modules, or touch the network or the file system |
| Preload | `app/src/preload/` | The `contextBridge` `api` object, one typed method per IPC channel. The only user of `ipcRenderer`. | Expose `ipcRenderer` or a generic send/invoke |
| Main | `app/src/main/` | Every side effect: settings, templates and keys on disk, file dialogs, the storage platforms, Google sign-in and the transfer queue | Trust anything the renderer sends |
| Shared | `app/src/shared/` | The IPC contract and pure helpers used by the others | Contain side effects |

ESLint enforces the import boundaries (`no-restricted-imports` in `app/eslint.config.mjs`): code in `renderer/` and `shared/` can't import `electron` or Node's built-in modules, and code in `main/` can't import `ipcRenderer`.

Electron-specific code stays out of the renderer, so that moving to Tauri later only means rewriting the main-process code.

## Code organization

Inside each part, code is split into folders by kind (see [Layout](#layout) for where each part is):

| Folder | Holds | In |
|---|---|---|
| `services/` | Classes that do the work and own its side effects, such as `StorageService` or `TemplateService` | main, renderer |
| `constants/` | Every module-level constant: names, limits, messages, labels and fixed settings | main, renderer, shared |
| `types/` | Every named type and interface, including the ones inferred from a zod schema | main, renderer, shared |
| `validation/` | zod schemas, and checks of anything from outside, such as IPC payloads, the app's files or a typed-in location | main, renderer, shared |
| `utils/` | Pure functions, with no side effects | main, renderer |
| `pages/` | One component per page, built from compositions | renderer |
| `theme/styles/` | `global.css`, `fonts.css`, and `style-constants.ts` with the Tailwind class strings components share | renderer |
| `theme/components/` | Basic building blocks, such as `Button`, `Field`, `ToggleGroup` and `Modal` | renderer |
| `theme/components/icons/` | One component per icon, such as `EditIcon`, wrapping Phosphor, and an `index.ts` that exports them all (see [UI.md](UI.md#theme)) | renderer |
| `theme/compositions/` | Pieces built from components, such as `SideMenu`, `TemplatePicker`, `TransferList` and `ConfirmDialog` | renderer |

- **Names:** a file's name ends in its kind: `s3-service.ts`, `storage-constants.ts`, `template-types.ts`, `location-validation.ts`, `format-utils.ts`. React components are one per file and named after the component, such as `Button.tsx` or `DownloadPage.tsx`. The icons folder's `index.ts` is the one index file, so icons import from one place.
- **Constants and types:** module-level constants live only in `constants/` (and `theme/styles/style-constants.ts`), and named types only in `types/`. A component's props may stay in its signature.
- **Services:** each service is a class, created once and handed to whatever uses it. A service takes what it needs in its constructor, typed as only the methods it calls, such as `Pick<TemplateService, 'getOfKind' | 'accessFor'>`, so tests can pass small fakes.
  - Main creates all its services in `app/src/main/index.ts`. `IpcService` connects each channel to one service method behind the sender and payload checks, and holds no logic of its own.
  - In the renderer, each service wraps the part of `window.api` it needs, and its file exports one instance, such as `transferService`, plus the React hook built on it, if any, such as `useTransfers`. Pages and compositions use those instances, never `window.api` itself. The renderer's components are React function components.
- **Shared:** `app/src/shared/` holds only what at least two parts use. The validation the renderer uses, such as `parseLocation`, has no zod, so zod stays out of the renderer's bundle.

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
| `app:status` | none | whether OS encryption is available for keys, and the app's version |
| `app:copyText` | the text, up to 20,000 characters | nothing, once main put it on the clipboard |
| `settings:get`, `settings:update` | none, or the settings to change, apart from the download folder | the settings |
| `settings:chooseDownloadFolder` | none | the settings, after main's folder picker closed |
| `templates:list` | none | the templates, without keys |
| `templates:create` | name, type, platform, location, and either the platform's keys or the ID of a template on the same platform to copy them from | the new template, once main checked it with the platform, after a Google sign-in for typed-in Google keys |
| `templates:update` | the template ID, and the same as `templates:create`, except that the keys may also be kept | the changed template |
| `templates:delete` | template ID | nothing |
| `templates:cancelSignIn` | none | nothing. A Google sign-in that's waiting in the browser stops, and adding the template fails |
| `upload:chooseFiles` | upload template ID, and S3's storage class (Glacier Deep Archive or Standard), Azure's access tier (Archive, Cold, Cool or Hot), or none for Google Drive | how many files main queued after its file picker closed |
| `upload:chooseFolder` | the same | how many files main queued from the folder after its folder picker closed |
| `upload:paths` | the same, and the paths the preload read from files and folders dropped on the page | how many files main queued |
| `download:list` | download template ID, folder (a prefix on S3 and Azure, a folder ID from an earlier listing on Google Drive, or none for the top), continuation token | one page of subfolders, each with the ID that opens it and its name, and of files with their storage class or access tier and restore state |
| `download:file` | download template ID, the file's key (an S3 key, an Azure blob name or a Google Drive file ID) | the name main saves the file under in the download folder |
| `download:delete` | download template ID, the file's key | nothing, once the platform deleted the file, or Google Drive moved it to the trash |
| `download:restore` | download template ID, the file's key, and S3's speed (Standard or Bulk) and days, or Azure's tier (Hot, Cool or Cold) and priority (Standard or High) | nothing, once the platform accepted the restore |
| `download:folderSummary` | download template ID, a folder from a listing (not the top) | how many files the folder holds at any depth, their total size, and how many are archived |
| `download:folder` | the same | how many of its files main queued, how many it skipped because they can't be downloaded now, and the folder's name in the download folder |
| `download:deleteFolder` | the same | nothing, once the platform deleted everything in the folder, or Google Drive moved the folder to the trash |
| `download:restoreFolder` | the same, and the restore choices of `download:restore` | how many archived files in the folder main asked the platform to restore. Refused on Google Drive |
| `transfers:list` | none | the transfers |
| `transfers:pause`, `transfers:resume`, `transfers:cancel` | a transfer ID | nothing. Cancel also deletes what the transfer moved |
| `updates:status`, `updates:check` | none | where updating stands: unsupported, idle, checking, current, available, downloading, ready or failed |
| `updates:download`, `updates:install` | none | nothing. Install quits the app and starts the downloaded installer |

Main also sends `transfers:changed`, with the full transfer list, whenever a transfer changes, and `updates:changed` whenever the update state does. Progress reaches it at most every 200 ms.

## Templates

A template is a named place on one platform plus the keys that reach it. `StorageService` (`app/src/main/services/storage-service.ts`) sends every call to the template's platform: `S3Service`, `AzureBlobService` or `GoogleDriveService`, which share the `PlatformStorage` interface (`app/src/main/types/storage-service-types.ts`).

| Platform | Location | Keys | Checked when added |
|---|---|---|---|
| Amazon S3 | `s3://bucket/folder/`: a bucket and a key prefix | An IAM user's access key ID and secret access key | Main finds the bucket's region with `HeadBucket`. S3 reports it even when the keys may not list the bucket, so keys that can only upload work too. |
| Azure Blob Storage (beta) | The container URL, `https://account.blob.core.windows.net/container/folder/`: a storage account in Azure's public cloud, a container and a name prefix | The storage account's key | Main reads the container's properties. |
| Google Drive (beta) | A folder's link, or My Drive | The user's own OAuth client ID and secret; main signs in through the browser and keeps the refresh token Google gives (see [SECURITY.md](SECURITY.md#google-sign-in)) | Main reads the folder, checks it's a folder, and keeps its name. |

- **Upload templates** point at a folder or the top of a bucket or container. Uploaded files keep their names, so a file's key is the folder plus its name. An uploaded folder keeps its name too: each file in it, at any depth, gets the key `<template folder><folder name>/<path inside the folder>`. On Google Drive the key is that path inside the template's folder, and the folders on the way are found by name or made. Links inside a folder are skipped, so a link to a parent folder can't loop.
- **Download templates** point at a whole bucket or container, or any Google Drive folder, which the Browse page browses one folder level at a time.

Saved templates have a `platform`; a template, keys or transfer saved without one is an S3 one. Names are unique, ignoring case.

A new template can reuse another template's keys on the same platform: main copies them from that template's entry in `credentials.bin`, so they never reach the page. Azure keys copy only to a template for the same storage account, and copied Google keys reuse that template's sign-in.

A template can be changed later: its name, type, platform, location and keys. Main asks the platform again only when the bucket, container, Drive folder or keys changed, and needs OS encryption only for new keys, so a rename works even where no keyring runs. Moving a template to another platform needs keys for it. The template keeps its ID, so transfers that started with it keep using its current keys.

## Transfers

- Main runs uploads and downloads from a queue, three at a time, and each keeps going while the window is minimized (`app/src/main/services/transfer-service.ts`).
- Every platform splits a file into 8 MiB parts, or larger parts for files over about 78 GiB, so no file needs more than 10,000 parts (`app/src/main/utils/part-utils.ts`):
  - **S3:** a file that fits in one part goes with a single `PutObject`; a larger one as a multipart upload, up to four parts at once.
  - **Azure:** a file that fits in one part goes with a single Put Blob; a larger one as blocks, up to four at once, which a Put Block List commits in order. Each block has a fixed-length ID made from its number (`app/src/main/utils/azure-utils.ts`).
  - **Google Drive:** every file goes through a resumable upload session, one part after another in order, since Drive takes a session's chunks only in order.
- S3 uploads are stored as Glacier Deep Archive (`DEEP_ARCHIVE`) or Standard (`STANDARD`), and Azure uploads in the Archive, Cold, Cool or Hot access tier, chosen on the Upload page. It starts with the defaults from Settings: Glacier Deep Archive and Archive until changed. Google Drive has no storage classes. Main checks that the class suits the template's platform before it opens a picker (`app/src/main/utils/storage-utils.ts`).
- Apart from the storage class, every upload uses the same settings on its platform:
  - **Checksums:** on S3, a CRC64NVME checksum for each part and for the whole file, which S3 checks on arrival (`app/src/shared/constants/storage-constants.ts`); the multipart upload is completed with every part's checksum. On Azure, an MD5 for each block, or for a file sent whole, which Azure checks on arrival. On Google Drive, main hashes the file with MD5 as it sends it and compares the hash Drive reports once the session finishes; when they differ, it deletes the uploaded file and the upload fails.
  - **Encryption:** no encryption header on S3, so the bucket's default encryption applies. Azure Storage and Google Drive always encrypt.
  - No tags and no metadata yet.
  - **Same name:** on S3 and Azure, an upload replaces a file with the same key. Google Drive keeps both, side by side.
- The app never changes a bucket's or storage account's versioning.
- Downloads go straight into the download folder from Settings, which is the system's Downloads folder until another is chosen. A file is saved under its key's last part, or its name on Google Drive with any slash replaced, made safe for the disk (see [SECURITY.md](SECURITY.md#file-paths)). When a file, a partial download or a queued download already has that name, the new file gets a number before its extension, such as `report (2).pdf` or `backup (2).tar.gz`, so nothing is overwritten.
- A folder download lists every file under the folder (all of a prefix on S3 and Azure, or each subfolder in turn on Google Drive) and queues each file that can be downloaded now as its own transfer. They go into a new folder in the download folder, named after the folder, or `photos (2)` when a file, folder or queued download already has that name, and keep the folders inside it. Each part of a file's path is made safe the way a file name is, and two files whose safe paths match, ignoring case, get numbers. The runner creates a file's folders when its transfer starts (`app/src/main/services/download-service.ts`).
- A download streams into `<file>.part` in that folder, which becomes the file only once complete.

### Resuming

A transfer that stops continues later from where it stopped, instead of starting over:

- **Downloads** keep their `.part` file and the version of the file they began with. The next run asks only for the rest, with a `Range` request from the `.part` file's size (`app/src/main/utils/download-utils.ts`). S3 and Azure get the version, an ETag, as `If-Match`, so they refuse if the file changed since then (412). Google Drive has no such condition, so main first compares the file's MD5, or its modification time when Drive has no MD5, with the saved one. When the file changed, or the `.part` file is longer than the file (416), the download starts over. So does a Drive download whose range Drive ignored.
- **Uploads** keep the platform's handle on the unfinished upload and the parts it confirmed: on S3 the multipart upload ID and each part's ETag and checksum, on Azure each block's MD5, and on Google Drive the session URL and the parts sent. The next run sends only the missing parts: S3 and Azure then complete the upload with all of them, and Google Drive is asked how far it got, then sent the rest. An upload starts over when the local file's size or modification time changed, after stopping the old upload, or when the platform no longer has the upload: S3's `NoSuchUpload`, after a lifecycle rule removed it; Azure's `InvalidBlockList`, after it discarded blocks left uncommitted for a week; or a Drive session that's gone after a week.
- **Network errors** (no connection, resets, timeouts, throttling, and a platform's 5xx answers) are retried by themselves, after 2, 5, 10 and 30 seconds, then every minute, up to eight times (`app/src/main/constants/transfer-constants.ts`). The count starts again whenever bytes move, so a long transfer over a flaky connection keeps going. Other errors, such as access denied, stop the transfer as failed.
- **Pause** stops a transfer and keeps what it moved. **Resume**, or **Retry** for a failed one, puts it back in the queue. **Cancel** stops it and deletes what it moved: a download's `.part` file, an S3 upload's multipart upload, so S3 deletes its parts, or a Google Drive session. Azure keeps no handle on an unfinished upload, and discards its uncommitted blocks within a week.
- **Across restarts:** the transfers that haven't finished are saved in `transfers.json` in the app data folder, at most once a second while they run (`app/src/main/services/transfer-store-service.ts`). Quitting pauses them and saves them at once. On the next start they're back in the list as paused, with what they already moved.
- A transfer resumes where it started (the bucket and region, the storage account and container, or the template's Drive folder), with the current keys of its template. If the template was deleted, or its keys are now for another platform, it fails, and Cancel removes it.

### Keeping the computer awake

While any transfer is waiting, running or retrying, the computer doesn't go to sleep (`powerSaveBlocker` with `prevent-app-suspension`). The screen may still turn off.

## Archived files and deleting

- Files in Glacier Flexible Retrieval or Glacier Deep Archive on S3, and blobs in Azure's Archive tier, can't be downloaded until they're restored. Listings ask S3 for each file's restore status (`OptionalObjectAttributes: RestoreStatus`) and Azure for each blob's tier and archive status, and main reports each file as available, archived, restoring, or restored until a date (`app/src/main/utils/s3-utils.ts`, `app/src/main/utils/azure-utils.ts`).
- An S3 restore (`RestoreObject`) makes a temporary copy for the chosen number of days, at Standard or Bulk speed. Deep Archive usually takes up to 12 hours at Standard and 48 at Bulk.
- An Azure restore (Set Blob Tier) rehydrates the blob into the Hot, Cool or Cold tier for good, at standard priority, within 15 hours, or high priority, within an hour for blobs under 10 GB. Once it's there, it's simply available.
- Google Drive has nothing to restore. Google Docs, Sheets, Slides and other Google files have no content of their own to download, so the list marks them as unavailable.
- Delete removes one file by its key, after the page asked for confirmation: `DeleteObject` on S3, where a bucket with versioning on keeps older versions; Delete Blob with its snapshots on Azure, where an account with soft delete on keeps it for its retention days; and on Google Drive, moving it to the trash, where it stays for 30 days.
- Deleting a folder removes everything under it. S3 lists the prefix and deletes it in `DeleteObjects` batches of up to 1,000 keys, including the empty `folder/` objects some tools make, and stops at the first key S3 couldn't delete. Azure deletes the blobs, eight at a time, then the folder blobs of accounts with a hierarchical namespace, deepest first, since a folder that still has anything in it can't be deleted. Google Drive moves the folder, with everything in it, to the trash. Main refuses the top of a bucket or container, and on Google Drive any folder it didn't list inside the template's folder, so the template's own folder can't be trashed.
- Restoring a folder lists it, then restores each archived file in it with the chosen options, eight at a time (`app/src/main/services/storage-service.ts`).
- On S3, download templates need `s3:ListBucket`, `s3:GetObject`, `s3:RestoreObject` and `s3:DeleteObject`, and upload templates `s3:PutObject` and `s3:AbortMultipartUpload`. The IAM user the CloudShell script makes, `mousebucket`, gets all six of those actions on every bucket in the account. An Azure account key and a Google sign-in reach everything their account can. `app/src/renderer/src/constants/permission-constants.ts` holds these, with example policies, for the Templates and How it works pages.

## Tests

Tests live in `app/tests/`, apart from the code they test. There are three kinds, each in its own folder. Inside each one, the folders mirror `app/`, so a module's test sits at the same path: `app/src/main/services/s3-service.ts` is tested in `app/tests/unit/main/services/s3-service.test.ts`, and `app/scripts/audit-check.mjs` in `app/tests/unit/scripts/audit-check.test.ts`.

| Folder | Tests | Runs with | Command |
|---|---|---|---|
| `tests/unit/` | One module at a time, in memory, with S3 mocked by `aws-sdk-client-mock`, and Azure's and Google's clients replaced by small fakes through the services' constructors. Also the checks that config files agree, such as the app's names and the Node version. | Vitest, project `unit` | `npm run test:unit` |
| `tests/integration/` | Modules working with real files in fresh temporary folders, or a real loopback server: the settings, template and window-state services, the uploads and downloads of each platform's service, and Google sign-in | Vitest, project `integration` | `npm run test:integration` |
| `tests/e2e/` | The built app, driven through its window the way a user would | Playwright | `npm run test:e2e` |
| `tests/support/` | Helpers for all three: paths into the repo, and temporary folders | | |

`npm test` runs the unit and integration tests. Unit and integration tests end in `.test.ts`, and end-to-end tests in `.spec.ts`. `app/tsconfig.tests.json` typechecks all of them.

### End-to-end tests

- `npm run test:e2e` builds the app in staging mode, then Playwright starts the build in `out/` with the Electron in `node_modules/`. It's the unpackaged build, because the packaged app's fuses block the debugger connection Playwright drives it through. The launch check covers the packaged app (see [ENVIRONMENTS.md](ENVIRONMENTS.md#continuous-integration)).
- Each test starts its own copy of the app, one test at a time (`app/tests/e2e/support/app.ts`). Its app folder is a fresh folder under `.cache/tmp/e2e/` with a `package.json` that points at the build. The app keeps its data next to its folder, so each test starts with only the templates and settings it seeds, and never sees `app/data/`. The folder is deleted when the test ends.
- Test windows stay off the desktop, so running the tests doesn't flicker. The fixture starts Electron with `-r app/tests/e2e/support/quiet-window.cjs`, which makes each window transparent, keeps it off the taskbar and off the screen, and never focuses or maximizes it. The windows still count as shown, so their pages render as usual.
- No test reaches AWS, Azure or Google. Once the window is open, the test swaps main's handlers for the channels that would call a platform for handlers that answer with sample data (`app/tests/e2e/support/sample-storage.ts`): `download:list`, `download:file`, `download:delete`, `download:restore`, the four folder channels, `upload:chooseFiles`, `upload:chooseFolder` and `templates:create`, which skips the platform check and Google's sign-in. The sample transfers also answer `transfers:pause`, `transfers:resume` and `transfers:cancel`, and `app:status` reports OS encryption as available, because CI's Linux runner has no keyring and the Templates form would stay disabled. It waits for the window because main registers its own handlers before it opens the window. Everything else runs as built: the preload, the IPC checks, settings, and listing and deleting templates.

## Stack

- Electron 45, scaffolded with electron-vite's `react-ts` template.
- React and TypeScript in strict mode.
- Tailwind CSS, and Phosphor for icons (see [UI.md](UI.md)).
- `@aws-sdk/client-s3`, `@azure/storage-blob`, `@googleapis/drive` and `google-auth-library`, in main only.
- zod for the IPC payload schemas.
- electron-builder for installers, and electron-updater for updates (see [PACKAGING.md](PACKAGING.md)).
- Vitest, with `aws-sdk-client-mock` for S3 and fakes for Azure and Google, and Playwright for end-to-end tests.
- ESLint (with typescript-eslint and the React plugins) and Prettier.
