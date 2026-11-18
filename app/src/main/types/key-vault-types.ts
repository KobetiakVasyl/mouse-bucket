// The OS encryption that protects IAM keys on disk, and the parts of Electron's safeStorage it uses. See docs/SECURITY.md.
export interface Decrypted {
  text: string
  // The OS rotated its key, so the data should be encrypted again.
  shouldReEncrypt: boolean
}

export interface KeyVault {
  available(): Promise<boolean>
  encrypt(text: string): Promise<Buffer>
  decrypt(data: Buffer): Promise<Decrypted>
}

export interface OsEncryption {
  isAsyncEncryptionAvailable(): Promise<boolean>
  getSelectedStorageBackend(): string
  encryptStringAsync(plainText: string): Promise<Buffer>
  decryptStringAsync(encrypted: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }>
}
