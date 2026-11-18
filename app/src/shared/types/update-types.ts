// Where checking for, downloading and installing an update stands, as main reports it to the page. See docs/PACKAGING.md.

// Unsupported: run from source, or not an installed build that can update itself.
// Current: the newest version is the one running.
export type UpdateState =
  | { status: 'idle' }
  | { status: 'unsupported' }
  | { status: 'checking' }
  | { status: 'current' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'ready'; version: string }
  | { status: 'failed'; error: string }
