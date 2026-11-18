// The parts of the Azure SDK's container client that AzureBlobService uses, and how it gets one. See
// docs/ARCHITECTURE.md.
import type { ContainerClient } from '@azure/storage-blob'
import type { AzureAccess } from './credential-types'

export type AzureContainer = Pick<
  ContainerClient,
  'getProperties' | 'listBlobsByHierarchy' | 'getBlockBlobClient'
>

export type ConnectContainer = (access: AzureAccess) => AzureContainer
