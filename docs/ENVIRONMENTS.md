# Environments

The app has exactly two environments: **staging** and **production**. There is no development or local environment. Running the app from source, on the host or in the Linux container, is staging.

| | Staging | Production |
|---|---|---|
| Used for | Building and testing the app, and pre-release builds | Releases for users |
| Git branch | `staging` | `production` |
| How it runs | `npm run staging` (hot reload, on the host), `npm run staging:preview` (build and launch), or a staging installer | Production builds only |
| Build mode | `staging` | `production` |
| Env file | `.env.staging` | `.env.production` |
| Product name | `MouseBucket Staging` | `MouseBucket` |
| `appId` | `io.github.kobetiakvasyl.mousebucket.staging` | `io.github.kobetiakvasyl.mousebucket` |
| Installers | `npm run dist:staging` (`app/electron-builder.staging.yml`) | `npm run dist` (`app/electron-builder.yml`) |
| App data | Its own (see [App data](#app-data)) | Its own |
| Window title | Ends with "STAGING" | No marker |
| DevTools | Allowed | Blocked (`webPreferences.devTools: false`) |

`app/src/main/constants/app-constants.ts` holds the production name and ID, and `app/src/main/services/environment-service.ts` derives staging's from them. The running app uses them for the window title, the Windows taskbar ID and the AppImage data folder. `app/tests/unit/main/constants/app-constants.test.ts` checks that `app/package.json` and both installer configs match them.

## Where work happens

- **On the host.** Edit, run, typecheck, lint and test on your own machine, with the Node version in `.node-version` (see [SETUP.md](SETUP.md)), in any shell. `npm test` starts Vitest through `app/scripts/test.mjs`, which upper-cases the drive letter of the current folder on Windows. Vitest 5 can't load the tests when the drive letter is lower case, as it is in VS Code's terminal.
- **In the Linux container,** to check the Linux build from a Windows machine: run the app and its checks on Ubuntu, and build the Linux installers (see [Linux container](#linux-container)).
- **On Windows,** to check the Windows build.
- **In CI,** on Linux and Windows, for every push and pull request (see [Continuous integration](#continuous-integration)).

## Caches

npm, Electron and electron-builder keep their download caches in `.cache/` at the repo root (gitignored), not in the user's profile:

- npm: `cache=../.cache/npm` in `app/.npmrc`. npm resolves that path from the folder it runs in, so run npm in `app/`.
- Electron and electron-builder: `app/scripts/with-caches.mjs` runs the `postinstall` and `dist` commands with `electron_config_cache` and `ELECTRON_BUILDER_CACHE` set to folders in `.cache/`, unless either is already set. When neither is set, it also points their temp files at `.cache/tmp/`.
- The Linux container's image sets all three caches to its home folder (`/home/ubuntu/.cache`), so the container's temp files stay in the container too.
- CI keeps `.cache/npm`, `.cache/electron` and `.cache/electron-builder` between runs (see [Continuous integration](#continuous-integration)).
- Tests that write files use fresh folders under `.cache/tmp/tests/` (`app/tests/support/temp-dir.ts`), never the system's temp folder. End-to-end tests run each copy of the app from a fresh folder under `.cache/tmp/e2e/`, and Playwright writes its output to `.cache/playwright/`.

## Separate app identity

Staging has its own `appId` and product name. Its installers also use their own package name, `mousebucket-staging`, set with `extraMetadata` in `app/electron-builder.staging.yml`. So:

- Staging and production can be installed side by side.
- Each keeps its own app data, so a staging build can never read production's data.
- Uninstalling staging never removes production's files. The Windows uninstaller also deletes the `%APPDATA%` folder named after the package, and the AppImage's executable is named after it.

## App data

The app data is what Electron calls `userData`: everything the app stores, including Chromium's caches.

The app keeps its data where it runs from, not in the user profile (`app/src/main/services/environment-service.ts`):

| How the app runs | App data folder |
|---|---|
| From source | `app/data/<environment>/`, gitignored and excluded from installers |
| From source in the Linux container | `app/data/<environment>/` in the container's own `data` volume, separate from the host's |
| Installed on Windows | `data\` inside the install folder |
| AppImage | `<product>-<environment>-data/` next to the AppImage file |
| Other packaged Linux builds, such as `dist/linux-unpacked/` | Electron's default folder, under `~/.config/` |

Only one copy of the app runs per app data folder (`app.requestSingleInstanceLock()`). Starting a second copy focuses the first one's window instead. Staging and production have different folders, so one of each can run at the same time.

The app's own files in that folder:

| File | Holds |
|---|---|
| `settings.json` | The theme, whether the welcome page was seen, and the default storage class for uploads |
| `templates.json` | Each template's name, type, bucket, folder and region |
| `credentials.bin` | Each template's IAM keys, encrypted by the OS (see [SECURITY.md](SECURITY.md#keys-at-rest)) |
| `window-state.json` | The window's size, position and maximized state, saved when it closes (see [UI.md](UI.md#the-apps-window)) |

Each is written to a temporary file first and then renamed over the old one, so a crash never leaves a half-written file.

## AWS resources

The environment doesn't decide which bucket or keys the app uses. In both environments the user enters them in the app.

## Env files

- There are exactly two, one per environment: `.env.staging` and `.env.production`. There's no `.env`, `.env.local` or `.env.development`.
- Both are gitignored, and `.env.example` is the committed template. They sit at the repo root, and electron-vite's `envDir` points there from `app/`.
- electron-vite loads the file that matches the build mode.
- They hold secrets only, such as the GitHub MCP token for Claude Code in `.env.staging`. Settings that ship in the app live in typed, committed code instead, for two reasons:
  - CI builds don't have the gitignored files.
  - electron-vite bundles any value with a `MAIN_VITE_`, `PRELOAD_VITE_` or `RENDERER_VITE_` prefix into the installer. Each bundle reads only its own prefix: `app/electron.vite.config.ts` sets `envPrefix` for each one, which keeps electron-vite from also bundling `VITE_` values into all three.

## How the environment is chosen

- The environment is fixed when the app is built, through electron-vite's `--mode` flag (`staging` or `production`). It can't be switched while the app is running. A build in any other mode stops at startup (`app/src/main/services/environment-service.ts`).
- On the host, `npm run staging` runs electron-vite's hot-reload server in `staging` mode. Renderer changes show up in the open window, and main or preload changes restart the app.
- `npm run staging:preview` builds in `staging` mode and launches the result, without hot reload. Use it in the Linux container, which gets no file-change events (see [Limits](#limits)).
- Code reads the environment from `import.meta.env.MODE`. Never use Vite's `import.meta.env.DEV` to tell the environments apart: it only says whether the hot-reload server is running.

## Continuous integration

[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs on every push and pull request to `staging` and `production`, on Ubuntu 24.04 and Windows Server 2025. It runs `npm ci`, the typecheck, lint, format check, and the unit and integration tests. Then it runs the end-to-end tests, which build the app in staging mode, under `xvfb-run` on Ubuntu, and builds the app in production mode (see [ARCHITECTURE.md](ARCHITECTURE.md#tests)). Node comes from `.node-version`. The npm cache, and Electron's and electron-builder's downloads, are kept between runs and renewed when `app/package-lock.json` changes.

On pushes and manual runs, CI then builds the installers for the branch's environment: staging installers from `staging`, and production installers from `production`. It builds the app with electron-vite and the installers with electron-builder, without the typecheck that `npm run dist` adds, because the first job already ran it. It builds the AppImage on Ubuntu and the Windows installer on Windows, and keeps both as workflow artifacts for 14 days. Pull requests skip this step.

Before uploading, CI starts each built app with the `--launch-check` switch (`npm run launch-check -- <environment>`, run under `xvfb-run` on Ubuntu). The script starts exactly that environment's build at the version in `app/package.json`, finding its name in the environment's electron-builder config (`app/scripts/launch-check-target.mjs`), and fails if it isn't in `app/dist/`. With that switch, the app quits with exit code 0 once the page has loaded its status, settings and templates from main over IPC, which the page marks with `data-state="ready"` on `<html>`. That proves the preload, the IPC sender check and the bundled main code all work in the packaged app. It quits with its own error code if the page failed to load, didn't render, the renderer crashed, loading took longer than 30 seconds, or another copy of the same environment was already running (`app/src/main/services/launch-check-service.ts`). Any other failure shows up as a different exit code, for example a tampered `app.asar` on Windows. The security workflow is described in [SECURITY.md](SECURITY.md).

Check workflow changes before pushing them: `npm run actionlint`, run in `app/`, checks `.github/workflows/` with actionlint in Docker (`app/scripts/actionlint.mjs`, which pins the image by digest).

## Linux container

The Linux container runs the app on Ubuntu LTS, so the Linux build can be checked from a Windows machine. `compose.yaml` at the repo root defines it, and its image is built from `docker/linux/`.

### Commands

Run these from the repo root.

| Task | Command |
|---|---|
| Build or rebuild the image | `docker compose build linux` |
| Start the container | `docker compose up -d linux` |
| Install the app's dependencies in it | `docker compose exec linux bash -c "cd app && npm ci"` |
| Run the app in it | `docker compose exec linux bash -c "cd app && npm run staging:preview"` |
| Run another app command in it | `docker compose exec linux bash -c "cd app && npm test"` |
| Open a shell in it | `docker compose exec linux bash` |
| Stop it | `docker compose down` |
| Remove it with its image and volume, after testing | `docker compose down --rmi all --volumes` |

Rebuild only when `docker/linux/` changes. Code changes need no rebuild, because the repo is shared into the container at `/workspace`. The container keeps its own `app/node_modules`, `app/data` and `app/out` in volumes, separate from the host's, so each side installs its own dependencies, builds its own output and keeps its own app data.

### What's in the image

- Ubuntu 26.04 LTS.
- Node and npm, copied from the official `node` image at the version in `.node-version`. `app/tests/unit/node-version.test.ts` checks that the Dockerfile's `FROM node:` line matches it.
- Both base images are pinned by digest. To update one, change its tag and digest together.
- git, and the non-root user `ubuntu` with passwordless sudo.
- The libraries Electron needs at runtime, and Liberation fonts for any character the bundled Montserrat lacks.
- D-Bus and GNOME Keyring as the secret service for Electron's `safeStorage`, plus `secret-tool` to check it.
- `x11-utils`, to check the display connection.

### Settings

| Setting | Why |
|---|---|
| `security_opt: seccomp=unconfined` | Chromium's sandbox needs user namespaces, which Docker's default seccomp profile blocks. Relaxing seccomp in this container keeps Electron's sandbox on, instead of running the app with `--no-sandbox`. Installers aren't affected. |
| `shm_size: 1gb` | Chromium crashes with Docker's default 64 MB `/dev/shm`. |
| `init: true` | tini runs as PID 1 and reaps Chromium's exited child processes. |
| X11 socket mount and `DISPLAY` | The app's windows appear on the host's desktop. |
| `node_modules` volume at `app/node_modules` | Much faster than the shared folder, and never mixed up with the host's binaries. |
| `data` volume at `app/data`, `out` volume at `app/out` | The app's data and build output stay apart from the host's. Chromium's profile and the saved keys are encrypted differently on each OS, and the two builds would overwrite each other. |
| `XDG_RUNTIME_DIR`, `DBUS_SESSION_BUS_ADDRESS` (set in the image) | Where the D-Bus session bus and the keyring keep their sockets. |
| `XDG_CURRENT_DESKTOP=GNOME` (set in the image) | Electron picks its key store from the desktop it detects. With no desktop set it uses `basic_text`, even though the keyring is running. |
| `safe.directory /workspace` in the image's git config | The shared files don't belong to the container user, and git refuses to work in them otherwise. |

### Host settings

Compose reads these from the host's shell environment. The defaults fit Docker Desktop on Windows.

| Variable | Default | Change it when |
|---|---|---|
| `LINUX_X11_DIR` | `/run/desktop/mnt/host/wslg/.X11-unix` (WSLg) | On Linux, set it to `/tmp/.X11-unix`. |
| `DISPLAY` | `:0` | It's taken from the host when set, which is usually right on Linux. |
| `LINUX_UID`, `LINUX_GID` | `1000` | On Linux, set them to your `id -u` and `id -g`, so files the container creates belong to you. After changing them, run `docker compose down --volumes` and rebuild, because a volume keeps the owner it was created with. |

### Keyring

`docker/linux/start.sh` is the container's start command. It clears stale sockets left by a stopped container, starts the D-Bus session bus, unlocks GNOME Keyring (creating it on first start), and then keeps the container running. The keyring's fixed password only guards it inside the container.

Without the keyring, Electron falls back to `basic_text`, and keys can't be stored securely.

### Git

Git works inside the container for reading: status, diff and log. Commits and pushes happen on the host, because the container has no SSH key for pushing or signing.

### Limits

- With Docker Desktop, the project folder is shared from the host's drive. Linux gets no file-change events on it, so hot reload doesn't work in the container, and small-file I/O is far slower than on a Docker volume.
- The app's file dialogs show the container's files, not the host's.
- Dragging files from Windows into the app's window doesn't reach it.

Check file dialogs and drag-and-drop on the host instead.

### Line endings

`.gitattributes` keeps LF line endings in every checkout, including on Windows, so scripts run unchanged in the container.

## Production

Production is what users install.

### Branch

- The `production` branch holds production. A GitHub ruleset protects it. Read the current rules from `https://api.github.com/repos/KobetiakVasyl/mouse-bucket/rules/branches/production`.
- Changes reach `production` through pull requests from `staging`, merged with **Squash and merge**, so each pull request becomes one commit on `production`.
- Right after each merge, reset `staging` to `production`, so the next pull request starts from it. With a clean working tree, on the host:

  ```
  git switch staging
  git fetch origin
  git reset --hard origin/production
  git push --force-with-lease origin staging
  ```

  The reset drops anything pushed to `staging` after the pull request was merged, so sync before pushing more.

### Checks

Every push to `production`, and every pull request into it, runs the security workflow (see [SECURITY.md](SECURITY.md)) and CI.

### Builds

- Production builds use the `production` build mode and `.env.production`.
- Installer targets, and the checks each installer must pass on Linux and Windows, are in [PACKAGING.md](PACKAGING.md).
