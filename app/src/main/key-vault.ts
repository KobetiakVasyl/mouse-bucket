// Encrypts IAM keys through the OS before they're written to disk: DPAPI on Windows, the desktop's keyring on Linux. See docs/SECURITY.md.
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

// The parts of Electron's safeStorage the vault uses.
export interface OsEncryption {
  isAsyncEncryptionAvailable(): Promise<boolean>
  getSelectedStorageBackend(): string
  encryptStringAsync(plainText: string): Promise<Buffer>
  decryptStringAsync(encrypted: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }>
}

export function osKeyVault(encryption: OsEncryption, platform: string): KeyVault {
  return {
    available: async () => {
      if (!(await encryption.isAsyncEncryptionAvailable())) return false
      if (platform !== 'linux') return true
      // On Linux, basic_text means no keyring is in use, so the keys wouldn't really be protected.
      return encryption.getSelectedStorageBackend() !== 'basic_text'
    },
    encrypt: (text) => encryption.encryptStringAsync(text),
    decrypt: async (data) => {
      const { result, shouldReEncrypt } = await encryption.decryptStringAsync(data)
      return { text: result, shouldReEncrypt }
    }
  }
}
