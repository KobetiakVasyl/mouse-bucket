// Makes the Azure and Google clients each call uses, from a template's keys. Each call gets new ones, so no client
// outlives it with the keys. See docs/SECURITY.md.
import { ContainerClient, StorageSharedKeyCredential } from '@azure/storage-blob'
import { drive_v3 } from '@googleapis/drive'
import { OAuth2Client } from 'google-auth-library'
import type { AzureContainer } from '../types/azure-types'
import type { AzureAccess, DriveCredentials } from '../types/credential-types'
import type { DriveConnection } from '../types/drive-types'
import { containerUrl } from './azure-utils'

export function connectContainer({ account, container, credentials }: AzureAccess): AzureContainer {
  return new ContainerClient(
    containerUrl(account, container),
    new StorageSharedKeyCredential(account, credentials.accountKey)
  )
}

// The OAuth client trades the refresh token for short-lived access tokens as it needs them.
export function connectDrive({
  clientId,
  clientSecret,
  refreshToken
}: DriveCredentials): DriveConnection {
  const auth = new OAuth2Client({ clientId, clientSecret })
  auth.setCredentials({ refresh_token: refreshToken })
  return { files: new drive_v3.Drive({ auth }).files, auth }
}
