# UI

The renderer is React with TypeScript in strict mode, styled with Tailwind CSS. The renderer reaches main only through `window.api` (see [ARCHITECTURE.md](ARCHITECTURE.md)). It never imports `electron` or Node modules.

## Theme

- Grayscale: black, white and shades of gray between them. There are two exceptions: red, used only for actions that delete something and for error messages, and green, used only for Restore buttons.
- Montserrat is the font everywhere, except the example IAM policies on How it works, which use the system's monospace font so the JSON lines up. It ships inside the app, because the app loads nothing from the internet: `app/src/renderer/src/assets/fonts/montserrat/` holds its variable-weight `.woff2` files (Latin, Latin Extended, Cyrillic, Cyrillic Extended and Vietnamese) with their OFL license, and `app/src/renderer/src/theme/styles/fonts.css` declares them. They come from Fontsource's build of Montserrat 5.3.0. To update them, replace the files and `fonts.css` together.
- Icons come from Phosphor (`@phosphor-icons/react`), outlined (its `regular` weight) unless an icon is asked for `filled`. Each icon is its own component in `app/src/renderer/src/theme/components/icons/`, such as `EditIcon`, imported from that folder's `index.ts`; only that folder uses Phosphor itself, which ESLint enforces. An icon always goes with text, never instead of it: in the side menu, on Home's tiles and the drop zone, on action buttons, before folder and file names on Browse, and in drop-downs (a caret beside the chosen option, and a check beside it in the list). Icons are hidden from screen readers and sized a little larger than the text beside them. When their row runs out of space they shrink, and Home's tiles scale their icon and text down with the tile, so a small window still fits them.
- Corners are always rounded: buttons, inputs, tiles, cards, tables, dialogs, menu items and progress bars.
- Choices between a few options are toggle buttons, never radio buttons (`app/src/renderer/src/theme/components/ToggleGroup.tsx`). Choices with longer names, such as the storage class and the templates beyond the tiles, are drop-downs (`app/src/renderer/src/theme/components/Select.tsx`). The app draws its drop-downs itself instead of using the system's: a box that shows the chosen option, and a list below it, with a check beside the chosen one and, for templates, the S3 location under each name. The mouse or the keyboard picks from it: the arrow keys, Home and End move, Enter or Space chooses, and Escape closes only the list.
- Two themes: dark (light text on near-black), the default, and light (dark text on near-white). The choice is in Settings.
- `app/src/renderer/src/theme/styles/global.css` removes Tailwind's default colors and fonts, so nothing else can creep in. It defines eight color roles, each with a dark and a light shade, and the `dark` class on `<html>` picks the shades. Components use only these roles:

  | Role | Used for | Dark | Light |
  |---|---|---|---|
  | `paper` | The page background | `#111111` | `#f7f7f7` |
  | `surface` | The side menu, tiles, inputs, notices, tables, cards and dialogs | `#1a1a1a` | `#ffffff` |
  | `hover` | Hovered rows, tiles and buttons, the selected tile, and the progress bar's track | `#262626` | `#ebebeb` |
  | `line` | Borders and dividers | `#3d3d3d` | `#d1d1d1` |
  | `muted` | Secondary text: hints, descriptions, table headings, transfer details | `#a6a6a6` | `#595959` |
  | `ink` | Main text, the selected menu item and toggle, primary buttons and focus outlines | `#f0f0f0` | `#141414` |
  | `danger` | Delete buttons, their borders and the edge of error messages | `#f26b6b` | `#c81e1e` |
  | `positive` | Restore buttons and their borders | `#4ade80` | `#15803d` |

- `app/tests/unit/main/constants/theme-constants.test.ts` checks that every color in `global.css` is a shade of gray, apart from the `danger` and `positive` shades.
- Main passes the saved theme in the page's query string and paints the window's background in the theme's `paper` shade (`app/src/main/constants/theme-constants.ts`), so the first frame already has the right colors. The same test checks that the two `paper` shades match.

## Page structure

These rules hold for every page, section, card and dialog:

- Every page uses `PageLayout` (`app/src/renderer/src/theme/components/PageLayout.tsx`). It centers the page within a maximum width (Tailwind's `max-w-6xl`), and starts it with the title, an optional line that explains the page, then a divider. Tables, notices and sections span that width.
- Headers show the title, then an optional subtitle, then a horizontal divider, in that order: pages through `PageLayout`, sections through `Section` (`app/src/renderer/src/theme/components/Section.tsx`), cards through `Card`, dialogs through `Modal`, and the welcome page.
- Action buttons go on the right: at the right end of their row, form, dialog, notice or toolbar, with the main action last. The drop zone is the one exception, because everything in it is centered.

## Layout and pages

A side menu on the left starts with the app's icon and name, then lists Home, Templates and Settings. How it works, "Check for updates" and "Show welcome page again" are at its bottom. The icon keeps its own colors in both themes. The page fills the rest of the window.

- **Welcome:** a full-window page that describes the app, with How it works and Close buttons. It shows on the first start only, until it's closed or How it works is opened, and again from the side menu.
- **Home:** an Upload tile and a Browse tile, side by side, each half the page wide and about two thirds of the window tall, then the transfers. A tile is disabled until a template of its type exists. While there are no templates, a notice as wide as the page, above the tiles, says to add the first one, with an "Add a template" button that opens Templates, which shows the same notice.
- **Upload:**
  - Pick an upload template.
  - Choose the storage class from a drop-down: Glacier Deep Archive or Standard, with a line on what the chosen one means. It starts with the default from Settings.
  - The upload settings show where files go and how S3 stores them (see [ARCHITECTURE.md](ARCHITECTURE.md#transfers)). Tags and metadata are shown as coming soon.
  - "Choose files…" and "Choose a folder…" open the system's pickers, and the chosen files, or every file in the folder, join the transfers. They sit in a dashed drop zone, which takes files and folders dragged onto it from the computer, and highlights while something is dragged over it. A drop that brings nothing from the computer says so.
- **Browse:** reached from the Browse tile.
  - Pick a download template, then browse its bucket in the Files section: its subtitle is a breadcrumb for the folder path, then come folders and files with their size, storage class and date. "Load more" fetches the next 1,000 entries.
  - Files in Glacier Flexible Retrieval or Glacier Deep Archive show whether they're archived, restoring, or restored until a date.
  - **Download** is offered for files that can be downloaded now. It saves the file into the download folder at once, and says so. When the name is taken, the new file gets a number, such as `report (2).pdf`.
  - **Restore**, in green, is offered for archived files. It opens a dialog to choose the speed and how many days the restored copy stays. The speed's buttons are Standard and Bulk; the hint below them gives the usual waiting time and says which one costs less. The days have a button for each of 1 to 7, and a box beside them for any other number up to 365; while the box holds anything else, it's marked and Restore is disabled. The dialog starts with the defaults from Settings: Bulk and 7 days unless changed.
  - **Delete**, in red, asks for confirmation in a dialog first.
  - Each file has a checkbox, and the column heading's checkbox selects every file shown. With files selected, a bar above the table counts them and offers **Download**, **Restore** and **Delete** for the selection. Each button shows how many of the selected files it applies to: Download the ones that can be downloaded now, Restore the archived ones, and Delete all of them. Delete asks first and lists the files. Opening another folder or template clears the selection.
  - Actions on several files run one file at a time. If one fails, the files done so far show as done, and the dialog stays open with the rest and the error.
- **Templates:**
  - The saved templates, in their own section, each with Edit and a red Delete that asks for confirmation first. Deleting a template changes nothing in the bucket.
  - A form that adds one: type, name, S3 location, and the IAM user. The form explains the location as it's typed and names the IAM permissions each type needs.
  - Edit turns the form into one that changes that template, filled in with its type, name and S3 location, and scrolls to it. The IAM user starts as "Keep the current keys", and can instead take new keys or another template's. "Save changes" or Cancel turns it back into the form that adds one.
  - The IAM user is either typed in (access key ID and secret access key) or copied from a saved template. A copy happens in main, so the keys never reach the page.
- **How it works:** what MouseBucket is, and how templates, uploading, downloading and restoring, deleting, transfers and the keys work, with example IAM policies for each template type. It needs no template, so it opens even before one exists.
- **Settings**, in three sections, each change saved at once:
  - **Appearance:** the dark or light theme.
  - **Defaults:** the storage class the Upload page starts with (Glacier Deep Archive unless changed), and the speed and days the Restore dialog starts with (Bulk and 7 days unless changed), chosen the way the dialog chooses them. Typed-in days save only while they're a whole number from 1 to 365.
  - **Download folder:** where downloads are saved (the system's Downloads folder unless changed), with "Change…" opening the system's folder picker.

"Check for updates" in the side menu opens the Updates dialog: the app's version, then a check of GitHub as it opens, unless an update is already found, downloading or downloaded. A newer version can then be downloaded, with its progress, and installed with "Restart and install" (see [PACKAGING.md](PACKAGING.md#updates)). A copy that can't update itself, such as one run from source, says so and doesn't check.

Upload and Browse pick a template from large tiles: the first 6 templates by name, case-insensitively, each showing its S3 location. Any others are in a "More templates" drop-down below them (`app/src/renderer/src/utils/template-utils.ts`).

Home is always reachable, and a new user lands there. Upload or Browse without a template of its type shows Home (`app/src/renderer/src/utils/navigation-utils.ts`).

The transfers list shows each upload and download with its template, status, size and a progress bar:

- While it's waiting, running or reconnecting after a network error, it has **Pause** and **Cancel**.
- Once paused it has **Resume** and **Cancel**, and once failed **Retry** and **Cancel**, with the error. Both continue from where the transfer stopped (see [ARCHITECTURE.md](ARCHITECTURE.md#resuming)).
- Cancel deletes what the transfer moved, so once anything moved it asks first: "Keep it" or "Cancel download" (or upload).
- Finished and cancelled transfers stay in the list until the app quits. Unfinished ones come back after a restart, paused.

Dialogs (confirmations, Restore and Updates) open over the page. Escape closes them, as do their Cancel or Close buttons, and an error inside one is shown in the dialog.

## The app's window

- The first start opens the window maximized. After that, the window opens where it was, with its size and maximized state, as saved in `window-state.json` when it closes (`app/src/main/services/window-state-service.ts`, and `windowPlacement` in `app/src/main/utils/window-utils.ts`). If that place is no longer on any screen, for example after a monitor is unplugged, the window opens maximized again.
- Minimizing keeps transfers running. The app doesn't hide in the background or the system tray: closing the window quits it.
- Closing the window while transfers are pending asks first: "Keep transferring" or "Pause and quit". Quitting pauses them, and they can be resumed after the next start.
- Errors from main are shown as they arrive. They never contain keys.
