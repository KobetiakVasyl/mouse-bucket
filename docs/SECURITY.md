# Security

The IAM policy on the user is the whole authorization boundary. Inside the app, the renderer is treated as untrusted, and everything with side effects lives in main.

## Window hardening

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true` on every `BrowserWindow`.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`. `base-uri` and `form-action` are listed explicitly because they don't fall back to `default-src`. Every build and installer, staging or production, uses this CSP unchanged. Only while the hot-reload server runs (`npm run staging` on the host) does it also allow inline styles and the hot-reload WebSocket (`style-src 'self' 'unsafe-inline'`, `connect-src 'self' ws://localhost:*`). The plugin in `app/electron.vite.config.ts` that makes that change fails the run if the CSP no longer contains what it replaces.
- The main process loads the hot-reload server's URL only in unpackaged staging runs, and only from `http://localhost` (`app/src/main/environment.ts`). Every other run loads the built files.
- Every web contents the app creates blocks `will-navigate`, and its `setWindowOpenHandler` denies everything (`app.on('web-contents-created')` in `app/src/main/index.ts`).
- The app opens no external links: nothing calls `shell.openExternal`.
- Every permission request, such as the camera, microphone or notifications, is denied (`setPermissionRequestHandler` and `setPermissionCheckHandler` on the default session).
- The window options, with the four `webPreferences` flags above, come from `app/src/main/window.ts`, and `window.test.ts` checks them.
- No remote content is ever loaded. No telemetry, no crash reporting, no remote assets.
- Production builds set `webPreferences.devTools: false`. Staging builds allow DevTools (see [ENVIRONMENTS.md](ENVIRONMENTS.md)).

## Electron fuses

Installers set Electron's fuses when they're built (`electronFuses` in `app/electron-builder.yml`):

- **RunAsNode off:** `ELECTRON_RUN_AS_NODE`, which editors such as VS Code set, can't turn the app into plain Node.js.
- **`NODE_OPTIONS` and `--inspect` arguments ignored:** nobody can inject code at startup or attach a debugger.
- **Asar integrity validation and only-load-from-asar on:** on Windows, the app refuses to start if its packed code was changed. Of the two targets, electron-builder embeds the hash to check against only in Windows builds, so the AppImage has no such check. Only-load-from-asar applies on both.
- **Cookie encryption on**, and the browser-process V8 snapshot off.
- **`GrantFileProtocolExtraPrivileges` stays on,** because the window loads its page through `file://` from inside `app.asar`, which needs it.

Runs from source use the unmodified Electron binary, so the fuses don't apply there.

## IPC

- Every handler in main validates its payload (see the IPC rules in [ARCHITECTURE.md](ARCHITECTURE.md)). A compromised renderer can only call the typed IPC surface.
- Error messages are redacted before they reach the renderer.
- File paths on disk built from S3 keys are sanitized for the platform and must stay inside the target directory. Windows forbids `: * ? " < > |`, trailing dots and spaces, and reserved names such as `CON` and `NUL`. Linux forbids `/` and the NUL byte.

## Secrets

- Secrets are never logged, and never included in error messages sent to the renderer.
- Claude Code's deny rules in `.claude/settings.json` keep it from reading the env files, `app/data/` and any `credentials.bin`, and from running the GitHub MCP token helper. Relative paths in those rules resolve from the folder Claude Code starts in (see [SETUP.md](SETUP.md#4-claude-code)).

## Dependencies

- The `allowScripts` field in `app/package.json` records which dependencies may run install scripts. It's managed with `npm approve-scripts` and `npm deny-scripts`. npm 11.16 still runs unreviewed scripts, with a warning, and a future npm release will block them. Approve a package only after reviewing what its script does.
- No dependency script is approved. The Electron binary is downloaded by the project's own `postinstall` script (`install-electron`), which runs on `npm install` and `npm ci`.
- `engine-strict` in `app/.npmrc` makes npm refuse to install with a Node version other than the one in `app/package.json`'s `engines` field, which matches `.node-version`.
- `electron-winstaller` is denied. Its script prepares Squirrel.Windows, and the Windows installer is built with NSIS.

## CI security checks

Every push to `staging` and `production`, and every pull request into either, runs [.github/workflows/security.yml](../.github/workflows/security.yml):

- **Secret scan:** gitleaks scans the full git history and fails if it finds a credential. Findings are redacted in the log.
- **Code scanning:** CodeQL analyzes the JavaScript and TypeScript with its extended security queries. Results appear in the repo's Security tab.
- **Dependency audit:** `app/scripts/audit.mjs` (`npm run audit`) runs `npm audit` and fails on any high or critical advisory that isn't in `app/audit-allowlist.json`. It also lists allowlisted advisories that npm no longer reports, so they can be removed.

Add an advisory to the allowlist only after reviewing it, and record why it's accepted. Remove it once a fixed version is installed.

Actions are pinned to commit SHAs, and the gitleaks image, the actionlint image and the Linux container's base images to their digests, so a moved tag can't change what runs. Every job gets a read-only token, except that CodeQL may upload its results.

The secret scan only catches a credential after it's been pushed, and in a public repo that means it's already exposed. GitHub's secret scanning with push protection blocks a known credential format before the push lands, so keep it on (Settings → Advanced Security).

## Updates

The app doesn't update itself.
