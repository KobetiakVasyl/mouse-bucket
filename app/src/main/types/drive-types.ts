// The parts of Google's clients that GoogleDriveService and GoogleSignInService use, how they get them, and what an
// upload session answered. See docs/ARCHITECTURE.md.
import type { drive_v3 } from '@googleapis/drive'
import type { OAuth2Client } from 'google-auth-library'
import type { DriveCredentials } from './credential-types'

export interface DriveConnection {
  files: Pick<drive_v3.Resource$Files, 'list' | 'get' | 'create' | 'update' | 'delete'>
  auth: Pick<OAuth2Client, 'getAccessToken'>
}

export type ConnectDrive = (credentials: DriveCredentials) => DriveConnection

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

// How far an upload session got: the bytes Drive has, or the finished file with Drive's MD5 of it.
export type SessionState =
  { done: false; received: number } | { done: true; id: string; md5Checksum: string }

// The parts of an OAuth client that signing in uses.
export type SignInClient = Pick<
  OAuth2Client,
  'generateCodeVerifierAsync' | 'generateAuthUrl' | 'getToken'
>

export type CreateSignInClient = (options: {
  clientId: string
  clientSecret: string
  redirectUri: string
}) => SignInClient
