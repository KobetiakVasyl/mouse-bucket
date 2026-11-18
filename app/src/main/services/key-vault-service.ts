// Encrypts IAM keys through the OS before they're written to disk: DPAPI on Windows, the desktop's keyring on Linux. See docs/SECURITY.md.
import type { Decrypted, KeyVault, OsEncryption } from '../types/key-vault-types'

export class KeyVaultService implements KeyVault {
  constructor(
    private readonly encryption: OsEncryption,
    private readonly platform: string
  ) {}

  async available(): Promise<boolean> {
    if (!(await this.encryption.isAsyncEncryptionAvailable())) return false
    if (this.platform !== 'linux') return true
    // On Linux, basic_text means no keyring is in use, so the keys wouldn't really be protected.
    return this.encryption.getSelectedStorageBackend() !== 'basic_text'
  }

  encrypt(text: string): Promise<Buffer> {
    return this.encryption.encryptStringAsync(text)
  }

  async decrypt(data: Buffer): Promise<Decrypted> {
    const { result, shouldReEncrypt } = await this.encryption.decryptStringAsync(data)
    return { text: result, shouldReEncrypt }
  }
}
