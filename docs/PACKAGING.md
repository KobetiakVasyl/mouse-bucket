# Packaging

How the app is built into installers and licensed.

## Installers

- Linux and Windows are the release targets, with equal priority. macOS isn't a target. electron-builder, configured in `app/electron-builder.yml`, builds:
  - Linux: AppImage
  - Windows: NSIS. It installs per user, into a folder the user picks.
- Installers aren't code-signed, on purpose: signing needs a certificate that has to be bought again before it expires. On Windows, SmartScreen therefore warns on the first run, and the user continues with "More info", then "Run anyway". The installer shows the publisher as unknown.
- On Windows, uninstalling deletes everything the app put on the machine: the install folder, the app's data inside it, and any app data Electron left in the user profile (`deleteAppDataOnUninstall`).
- On Windows, upgrading keeps the app's data. Installing a newer version runs the old version's uninstaller, and the `customRemoveFiles` hook in `app/build/installer.nsh` handles it in three steps:
  1. Move `data\` next to the install folder, as `<install folder>-data`.
  2. Remove the rest with electron-builder's own routine, which moves the old files aside and puts everything back, then aborts, if a file is in use.
  3. Move `data\` back.
- If an upgrade was interrupted and left `<install folder>-data` behind, the next upgrade's uninstall step, or the next install's last step, moves it back into `data\`. If `data\` exists by then too, the leftover goes into `data\interrupted-upgrade-<n>\` instead, so nothing is deleted.
- The old version's uninstaller runs silently during an upgrade, so its own messages don't show. When a file is in use, the installer shows electron-builder's "cannot be closed" message with Retry and Cancel.
- Choosing a different folder while upgrading starts with empty data: the old version's `data\` stays behind in the old folder. Move it into the new folder by hand.
- An AppImage keeps its data next to the file, so replacing the file with a newer version keeps the data.
- Run in `app/`, `npm run dist` builds the production installers for the current platform, and `npm run dist:staging` the staging ones. `app/electron-builder.staging.yml` extends the production config with staging's name, `appId` and package name (see [ENVIRONMENTS.md](ENVIRONMENTS.md#separate-app-identity)).
- Installer names: `MouseBucket-<version>-setup.exe` and `MouseBucket-<version>.AppImage`. The staging ones are `MouseBucket-Staging-…`.
- CI builds both platforms' installers on every push to `staging` and `production` (see [ENVIRONMENTS.md](ENVIRONMENTS.md#continuous-integration)).
- The icon is one image, `app/build/icon.png`. It must be square and at least 256×256, ideally 1024×1024. electron-builder generates the Windows `.ico` from it on every build. `app/resources/icon.png` is a copy that serves as the window icon on Linux.
- The version comes from `app/package.json`.
- Done when, on each target:
  - Linux (Ubuntu LTS): the AppImage runs without installing, and its data survives replacing it with a newer AppImage.
  - Windows: the installer installs into the chosen folder and runs under a clean user account. Installing a newer version keeps the app's data, and the uninstaller leaves nothing of the app behind. Checking it needs a Windows machine.
- Building the Windows installer needs Windows. On Linux, electron-builder needs Wine for it, and the Linux container has none.

## License

- MIT. `LICENSE` is at the repo root, and `app/package.json` has `"license": "MIT"`.
- Every npm package that ships inside the app is MIT or Apache-2.0 licensed. React, React DOM and scheduler (in the renderer) and zod (in main) are MIT. The AWS SDK and its `@smithy` packages (in main) are Apache-2.0, which requires shipping their license and NOTICE files. Build tools don't ship, and some of them use other licenses, such as ISC and MPL-2.0.
- The Montserrat font ships in the renderer under the SIL Open Font License 1.1, which requires shipping the license with it. Its files and `OFL.txt` are in `app/src/renderer/src/assets/fonts/montserrat/` (see [UI.md](UI.md#theme)).
- All dependencies are dev dependencies, so electron-builder packs no `node_modules`. The npm packages the app ships are bundled into its code instead. `app/vite-plugins/third-party-notices.ts` collects their license and NOTICE texts into `THIRD_PARTY_NOTICES.txt` next to each bundle that contains any (currently `out/main/` and `out/renderer/`), and that file ships inside the app.
- The plugin reads files named `LICENSE`, `LICENCE`, `COPYING` or `NOTICE`, optionally with a suffix such as `-MIT` and an extension such as `.md`. It warns about a bundled package without one. The renderer build fails if the plugin finds no packages at all, because the renderer always bundles React.
- Bundled files that aren't npm packages, such as the font, are listed in `app/electron.vite.config.ts` with their license file, and the plugin adds them to the renderer's notices.
- Electron's own license files ship with every build.

## Updates

The app doesn't update itself.
