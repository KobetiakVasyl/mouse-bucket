// What the page says when checking for or downloading an update failed. See docs/PACKAGING.md.
export const UPDATE_FAILED_MESSAGE = 'The update failed. Try again later.'
export const UPDATE_NETWORK_MESSAGE =
  "Couldn't reach GitHub. Check the internet connection and try again."

// Keyed by electron-updater's error code.
export const UPDATE_ERROR_MESSAGES: ReadonlyMap<string, string> = new Map([
  ['ERR_UPDATER_NO_PUBLISHED_VERSIONS', 'No version has been published yet.'],
  ['ERR_UPDATER_LATEST_VERSION_NOT_FOUND', 'No version has been published yet.'],
  [
    'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND',
    "The newest release doesn't include an update for this app."
  ],
  [
    'ERR_UPDATER_INVALID_RELEASE_FEED',
    "GitHub's list of releases couldn't be read. Try again later."
  ],
  ['ERR_UPDATER_INVALID_SIGNATURE', "The downloaded update isn't intact, so it wasn't installed."],
  ['ERR_CHECKSUM_MISMATCH', "The downloaded update isn't intact, so it wasn't installed."]
])
