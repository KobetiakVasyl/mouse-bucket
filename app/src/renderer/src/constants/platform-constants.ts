// The platforms by name, which of them are in beta, and how the template form names their location and keys. See
// docs/UI.md.
import type { Platform, TemplateKind } from '../../../shared/types/template-types'
import type { ChoiceOption } from '../types/component-types'

export const PLATFORM_LABELS: Record<Platform, string> = {
  s3: 'Amazon S3',
  azure: 'Azure Blob Storage',
  'google-drive': 'Google Drive'
}

// Azure Blob Storage and Google Drive work, but haven't been used for as long as S3.
export const BETA_LABEL = 'Beta'
export const BETA_PLATFORMS: ReadonlySet<Platform> = new Set(['azure', 'google-drive'])

export const PLATFORM_OPTIONS: ChoiceOption<Platform>[] = [
  { value: 's3', label: PLATFORM_LABELS.s3 },
  { value: 'azure', label: PLATFORM_LABELS.azure, badge: BETA_LABEL },
  { value: 'google-drive', label: PLATFORM_LABELS['google-drive'], badge: BETA_LABEL }
]

export const LOCATION_LABELS: Record<Platform, string> = {
  s3: 'S3 location',
  azure: 'Container URL',
  'google-drive': 'Google Drive folder'
}

export const LOCATION_EXAMPLES: Record<Platform, Record<TemplateKind, string>> = {
  s3: { upload: 'For example s3://my-bucket/folder/', download: 'For example s3://my-bucket' },
  azure: {
    upload: 'For example https://myaccount.blob.core.windows.net/backups/folder/',
    download: 'For example https://myaccount.blob.core.windows.net/backups'
  },
  'google-drive': {
    upload: "A folder's link from Google Drive, or My Drive",
    download: "A folder's link from Google Drive, or My Drive"
  }
}

// What the keys toggle is called on each platform.
export const KEYS_LABELS: Record<Platform, string> = {
  s3: 'IAM user',
  azure: 'Storage account key',
  'google-drive': 'Google sign-in'
}

// What each template type needs on each platform, below the type's buttons. S3's comes from its IAM permissions.
export const ACCESS_HINTS: Record<'azure' | 'google-drive', Record<TemplateKind, string>> = {
  azure: {
    upload: 'An account key reaches the whole storage account, so keep it to this computer.',
    download: 'An account key reaches the whole storage account, so keep it to this computer.'
  },
  'google-drive': {
    upload: 'The Google account you sign in with needs to be allowed to add files to the folder.',
    download:
      'The Google account you sign in with needs to be allowed to see, download and delete the files in the folder.'
  }
}

// What a platform's root is called in the Browse breadcrumb and messages.
export const ROOT_NOUNS: Record<Platform, string> = {
  s3: 'bucket',
  azure: 'container',
  'google-drive': 'folder'
}

// Shown below the platform buttons while a platform in beta is chosen.
export const BETA_HINT: Record<Platform, string | undefined> = {
  s3: undefined,
  azure: 'Azure Blob Storage is in beta: it works, but hasn’t been used for as long as Amazon S3.',
  'google-drive':
    'Google Drive is in beta: it works, but hasn’t been used for as long as Amazon S3.'
}

// The heading of the Browse table's storage column: none on Google Drive, which has no storage classes.
export const STORAGE_HEADINGS: Record<Platform, string | null> = {
  s3: 'Storage class',
  azure: 'Access tier',
  'google-drive': null
}

// The keys toggle's typed-in choice on each platform, for a new template and for one being changed.
export const ENTERED_KEYS_LABELS: Record<Platform, { added: string; changed: string }> = {
  s3: { added: 'Enter keys', changed: 'Enter new keys' },
  azure: { added: 'Enter the key', changed: 'Enter a new key' },
  'google-drive': { added: 'Enter an OAuth client', changed: 'Enter an OAuth client' }
}
