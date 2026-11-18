# aws-s3-desktop

MouseBucket (`io.github.kobetiakvasyl.mousebucket`): an Electron desktop app for browsing one S3 bucket and uploading and downloading files with the user's own IAM keys. There is no backend: the app talks to S3 directly. It targets Linux and Windows equally. TypeScript throughout, MIT licensed, public repo.

## Status

The app in `app/` is scaffolded: one hardened, empty window, with no features yet (see [ARCHITECTURE.md](docs/ARCHITECTURE.md)).

## Docs

`docs/` has one file per area and is the source of truth for how each area works:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md): processes, suggested layout, IPC rules, stack
- [ENVIRONMENTS.md](docs/ENVIRONMENTS.md): staging and production, nothing else, plus where work happens, the Linux container, CI and the `production` branch. Never add or refer to a "dev", "development" or "local" environment: running from source is staging.
- [SETUP.md](docs/SETUP.md): what each person sets up once
- [SECURITY.md](docs/SECURITY.md): window hardening, Electron fuses, IPC rules, secrets, dependencies, CI checks
- [UI.md](docs/UI.md): the renderer's styling and theme
- [PACKAGING.md](docs/PACKAGING.md): installers and license

Before working on an area, read its doc. If a change alters how an area works, update that doc in the same change.

Docs never hold open questions or plans. Those live in `local/OPEN-DECISIONS.md`, which is gitignored and exists only on the author's machine. Don't resolve an open decision yourself: ask the user, then document the answer in the relevant doc and remove it from that file.

Docs describe only the current state. Never record history in them, such as what changed, when it changed, or what something used to be. Git keeps the history.

## Commands

Run these in `app/` on the host. To check the Linux build, run the same commands in the Linux container with `docker compose exec linux bash -c "cd app && <command>"` from the repo root.

| Command | What it does |
|---|---|
| `npm ci` | Clean install from the lockfile, including the Electron binary |
| `npm run staging` | Run the app in staging mode with hot reload (on the host) |
| `npm run staging:preview` | Build in staging mode and launch, without hot reload (use this in the Linux container) |
| `npm run typecheck` | TypeScript, for main and preload, the renderer, then the `.mjs` scripts |
| `npm run lint` | ESLint, including the import boundaries below |
| `npm test` | Vitest, started through `scripts/test.mjs` |
| `npm run format`, `npm run format:check` | Prettier: rewrite, or only check (CI runs the check) |
| `npm run audit` | npm audit, checked against `audit-allowlist.json` |
| `npm run build:staging`, `npm run build:production` | Build without launching |
| `npm run dist`, `npm run dist:staging` | Production or staging installers for the current platform |
| `npm run launch-check -- staging`, `npm run launch-check -- production` | Start that environment's built app from `dist/` and check that it renders |
| `npm run actionlint` | Check `.github/workflows/` with actionlint, run in Docker |

## Architecture rules

The app lives in `app/`. `app/src/` has four parts with hard boundaries:

- `renderer/` (React) is UI only. It never imports `electron` or Node modules, and it never touches the network or the file system. It reaches main only through `window.api`.
- `preload/` is the only code that uses `ipcRenderer`. It exposes one narrow, typed `api` object through `contextBridge`. Never expose `ipcRenderer` itself or a generic send/invoke.
- `main/` owns every side effect: credentials, settings, S3 calls, disk I/O, dialogs and the transfer queue.
- `shared/` holds the types and the IPC channel map that the other three use. Change a contract here, never on one side only.

Keep Electron-specific code out of the renderer, so that moving to Tauri later stays possible.

## Security rules (ask before relaxing any of these)

- Every `BrowserWindow` uses `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` and `webSecurity: true`.
- Don't loosen the production CSP, load remote content or add telemetry.
- Treat the renderer as untrusted: every IPC handler validates its payload in main.
- Never log credentials or include them in error messages sent to the renderer.
- Sanitize file paths on disk built from S3 keys and check that they stay inside the target directory.

## Code conventions

- TypeScript strict mode. No `any`: use `unknown` and narrow it.
- Style with Tailwind CSS. The theme is black and white only, with Times New Roman as the font everywhere. Ask before adding a UI component library.
- Ask before adding a dependency, and pin exact versions.
- Use Vitest for tests and `aws-sdk-client-mock` to mock S3. New main-process logic gets a unit test.
- Comments are a short summary plus a reference to the doc that explains the details, for example `// Blocks navigation away from the app. See docs/SECURITY.md.` The explanation lives in `docs/*.md`, not in the code.
- Never keep legacy comments: commented-out code, notes about how something used to work, or comments that no longer match the code. Delete them whenever you touch that code.

## Branches

`production` and `staging` are protected by GitHub rulesets. Before committing or pushing, read a branch's current rules from `https://api.github.com/repos/KobetiakVasyl/aws-s3-desktop/rules/branches/<branch>` (public, no token needed) and follow them.

## Working in this repo

- Don't read, print or copy credentials, such as `~/.ssh`, `~/.aws`, the `.env*` files (the `.env.example` template is the one exception) or the app's `credentials.bin`. If a task needs one, ask the user where it is.
- Ask before running anything against any AWS bucket, staging or production (list, upload, download, delete).
- Commit or push only when asked. Commits and pushes happen on the host. The Linux container has no SSH key.
- Never push throwaway branches to try out CI. Check workflows locally with `npm run actionlint` and wait for a real push or pull request to run them.
- To read GitHub PRs, branches and commits, use the read-only `github` MCP server from `.mcp.json`. It can't write. For anything that changes GitHub, ask the user. Its token is read from `.env.staging` by `scripts/github-mcp-headers.mjs`. Never run that script yourself, because it prints the token.
- Work on the host. Use the Linux container only to check the Linux build, through `docker compose exec linux` (see [ENVIRONMENTS.md](docs/ENVIRONMENTS.md#where-work-happens)).
- npm scripts must be cross-platform, because they run on Windows and Linux, on the host, in the container and in CI. Use Node scripts, not POSIX-only shell commands.
- Before calling a change done, run typecheck, lint and tests (see Commands).
- When you finish testing, clean up everything you started: stop the app and any other processes, run `docker compose down --rmi all --volumes`, and delete build output (`app/dist/`, `app/out/`) and test data (`app/data/`). Also remove the images you pulled, such as the container's base images and actionlint's, unless another project's image or container uses them. Docker's build cache is shared by every project: clear it with `docker builder prune` only when `docker buildx du --verbose` shows nothing from other projects. Never touch other projects' containers, images, volumes or build cache.
