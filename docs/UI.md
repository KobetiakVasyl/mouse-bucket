# UI

The renderer is React with TypeScript in strict mode, styled with Tailwind CSS. The renderer reaches main only through `window.api` (see [ARCHITECTURE.md](ARCHITECTURE.md)). It never imports `electron` or Node modules.

## Theme

- Grayscale: black, white and shades of gray between them. The one exception is red, used only for actions that delete something and for error messages.
- Montserrat is the font everywhere, except the example IAM policies on How it works, which use the system's monospace font so the JSON lines up. It ships inside the app, because the app loads nothing from the internet: `app/src/renderer/src/assets/fonts/montserrat/` holds its variable-weight `.woff2` files (Latin, Latin Extended, Cyrillic, Cyrillic Extended and Vietnamese) with their OFL license, and `app/src/renderer/src/theme/styles/fonts.css` declares them. They come from Fontsource's build of Montserrat 5.3.0. To update them, replace the files and `fonts.css` together.
- Corners are always rounded: buttons, inputs, tiles, cards, tables, dialogs, menu items and progress bars.
- Choices between a few options are toggle buttons, never radio buttons (`app/src/renderer/src/theme/components/ToggleGroup.tsx`).
- Two themes: dark (light text on near-black), the default, and light (dark text on near-white). The choice is in Settings.
- `app/src/renderer/src/theme/styles/global.css` removes Tailwind's default colors and fonts, so nothing else can creep in. It defines seven color roles, each with a dark and a light shade, and the `dark` class on `<html>` picks the shades. Components use only these roles:

  | Role | Used for | Dark | Light |
  |---|---|---|---|
  | `paper` | The page background | `#111111` | `#f7f7f7` |
  | `surface` | The side menu, tiles, inputs, notices, tables, cards and dialogs | `#1a1a1a` | `#ffffff` |
  | `hover` | Hovered rows, tiles and buttons, the selected tile, and the progress bar's track | `#262626` | `#ebebeb` |
  | `line` | Borders and dividers | `#3d3d3d` | `#d1d1d1` |
  | `muted` | Secondary text: hints, descriptions, table headings, transfer details | `#a6a6a6` | `#595959` |
  | `ink` | Main text, the selected menu item and toggle, primary buttons and focus outlines | `#f0f0f0` | `#141414` |
  | `danger` | Delete buttons, their borders and the edge of error messages | `#f26b6b` | `#c81e1e` |

- `app/tests/unit/main/constants/theme-constants.test.ts` checks that every color in `global.css` is a shade of gray, apart from the two `danger` shades.
- Main passes the saved theme in the page's query string and paints the window's background in the theme's `paper` shade (`app/src/main/constants/theme-constants.ts`), so the first frame already has the right colors. The same test checks that the two `paper` shades match.

## Layout and pages

A side menu on the left starts with the app's icon and name, then lists Home, Templates and Settings. How it works and "Show welcome page again" are at its bottom. The icon is drawn inverted in the dark theme, so its lines stay light on dark. The page fills the rest of the window, and tables span its full width.

- **Welcome:** a full-window page that describes the app, with Close and How it works buttons. It shows on the first start only, until it's closed or How it works is opened, and again from the side menu.
- **Home:** an Upload tile and a Browse tile, side by side, each half the page wide and about two thirds of the window tall, then the transfers. A tile is disabled until a template of its type exists.
- **Upload:**
  - Pick an upload template.
  - Choose the storage class with toggle buttons: Glacier Deep Archive or Standard, each with a line on what it means. It starts with the default from Settings.
  - The upload settings show where files go and how S3 stores them (see [ARCHITECTURE.md](ARCHITECTURE.md#transfers)). Tags and metadata are shown as coming soon.
  - "Choose files…" opens the system's file picker, and the chosen files join the transfers.
- **Browse:** reached from the Browse tile.
  - Pick a download template, then browse its bucket: a breadcrumb for the folder path, then folders and files with their size, storage class and date. "Load more" fetches the next 1,000 entries.
  - Files in Glacier Flexible Retrieval or Glacier Deep Archive show whether they're archived, restoring, or restored until a date.
  - **Download** is offered for files that can be downloaded now. It saves the file into the download folder at once, and says so. When the name is taken, the new file gets a number, such as `report (2).pdf`.
  - **Restore** is offered for archived files. It opens a dialog to choose the speed (Standard or Bulk, with the usual waiting time) and how many days, from 1 to 365, the restored copy stays.
  - **Delete**, in red, asks for confirmation in a dialog first.
  - Each file has a checkbox, and the column heading's checkbox selects every file shown. With files selected, a bar above the table counts them and offers **Download**, **Restore** and **Delete** for the selection. Each button shows how many of the selected files it applies to: Download the ones that can be downloaded now, Restore the archived ones, and Delete all of them. Delete asks first and lists the files. Opening another folder or template clears the selection.
  - Actions on several files run one file at a time. If one fails, the files done so far show as done, and the dialog stays open with the rest and the error.
- **Templates:**
  - The saved templates, each with a red Delete that asks for confirmation first. Deleting a template changes nothing in the bucket.
  - A form that adds one: type, name, S3 location, and the IAM user. The form explains the location as it's typed and names the IAM permissions each type needs.
  - The IAM user is either typed in (access key ID and secret access key) or copied from a saved template. A copy happens in main, so the keys never reach the page.
- **How it works:** what MouseBucket is, and how templates, uploading, downloading and restoring, deleting, transfers and the keys work, with example IAM policies for each template type. It needs no template, so it opens even before one exists.
- **Settings:** the dark or light theme, the storage class the Upload page starts with (Glacier Deep Archive unless changed), and the download folder (the system's Downloads folder unless changed), with "Change…" opening the system's folder picker.

Upload and Browse pick a template from large tiles: the first 6 templates by name, case-insensitively, each showing its S3 location. Any others are in a "More templates" drop-down below them (`app/src/renderer/src/utils/template-utils.ts`).

While there are no templates, Home, Upload and Browse show Templates instead, so a new user lands there. Upload or Browse without a template of its type shows Home (`app/src/renderer/src/utils/navigation-utils.ts`).

The transfers list shows each upload and download with its template, status, size and a progress bar:

- While it's waiting, running or reconnecting after a network error, it has **Pause** and **Cancel**.
- Once paused it has **Resume** and **Cancel**, and once failed **Retry** and **Cancel**, with the error. Both continue from where the transfer stopped (see [ARCHITECTURE.md](ARCHITECTURE.md#resuming)).
- Cancel deletes what the transfer moved, so once anything moved it asks first: "Keep it" or "Cancel download" (or upload).
- Finished and cancelled transfers stay in the list until the app quits. Unfinished ones come back after a restart, paused.

Dialogs (confirmations and Restore) open over the page. Escape or Cancel closes them, and an error inside one is shown in the dialog.

## The app's window

- The first start opens the window maximized. After that, the window opens where it was, with its size and maximized state, as saved in `window-state.json` when it closes (`app/src/main/services/window-state-service.ts`, and `windowPlacement` in `app/src/main/utils/window-utils.ts`). If that place is no longer on any screen, for example after a monitor is unplugged, the window opens maximized again.
- Minimizing keeps transfers running. The app doesn't hide in the background or the system tray: closing the window quits it.
- Closing the window while transfers are pending asks first: "Keep transferring" or "Pause and quit". Quitting pauses them, and they can be resumed after the next start.
- Errors from main are shown as they arrive. They never contain keys.
