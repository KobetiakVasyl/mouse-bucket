import { describe, expect, it } from 'vitest'
import { osKeyVault, type OsEncryption } from './key-vault'

const encryption = (available: boolean, backend: string): OsEncryption => ({
  isAsyncEncryptionAvailable: async () => available,
  getSelectedStorageBackend: () => backend,
  encryptStringAsync: async (text) => Buffer.from(text),
  decryptStringAsync: async (data) => ({ result: data.toString(), shouldReEncrypt: true })
})

describe('osKeyVault', () => {
  it('is available when the OS can encrypt', async () => {
    expect(await osKeyVault(encryption(true, 'unknown'), 'win32').available()).toBe(true)
    expect(await osKeyVault(encryption(true, 'gnome_libsecret'), 'linux').available()).toBe(true)
  })

  it("isn't available without OS encryption", async () => {
    expect(await osKeyVault(encryption(false, 'unknown'), 'win32').available()).toBe(false)
  })

  it("isn't available on Linux without a keyring", async () => {
    expect(await osKeyVault(encryption(true, 'basic_text'), 'linux').available()).toBe(false)
  })

  it('passes on whether the OS wants the data encrypted again', async () => {
    const vault = osKeyVault(encryption(true, 'unknown'), 'win32')
    expect(await vault.decrypt(await vault.encrypt('keys'))).toEqual({
      text: 'keys',
      shouldReEncrypt: true
    })
  })
})
