import { describe, expect, it } from 'vitest'
import {
  isLicenseFile,
  packageRootOf,
  thirdPartyNotices
} from '../../../vite-plugins/third-party-notices'

describe('packageRootOf', () => {
  it('finds the package folder of a bundled module', () => {
    expect(packageRootOf('/repo/app/node_modules/react/cjs/react.production.js')).toBe(
      '/repo/app/node_modules/react'
    )
  })

  it('handles scoped packages and Windows paths', () => {
    expect(packageRootOf('D:\\repo\\app\\node_modules\\@scope\\pkg\\dist\\index.js')).toBe(
      'D:/repo/app/node_modules/@scope/pkg'
    )
  })

  it('uses the innermost node_modules for nested packages', () => {
    expect(packageRootOf('/r/node_modules/a/node_modules/b/index.js')).toBe(
      '/r/node_modules/a/node_modules/b'
    )
  })

  it('ignores the app’s own modules', () => {
    expect(packageRootOf('/repo/app/src/renderer/src/App.tsx')).toBeNull()
  })
})

describe('isLicenseFile', () => {
  it('accepts the usual license file names', () => {
    for (const name of [
      'LICENSE',
      'license.md',
      'LICENCE.txt',
      'LICENSE-MIT',
      'LICENSE-APACHE.txt',
      'LICENSE.markdown',
      'COPYING',
      'NOTICE.md'
    ]) {
      expect(isLicenseFile(name), name).toBe(true)
    }
  })

  it('rejects other files', () => {
    for (const name of ['README.md', 'license-checker.js', 'licenses', 'LICENSE.json']) {
      expect(isLicenseFile(name), name).toBe(false)
    }
  })
})

describe('thirdPartyNotices', () => {
  type GenerateBundle = (this: { getModuleIds: () => IterableIterator<string> }) => void

  function runWithoutPackages(required: boolean): void {
    const plugin = thirdPartyNotices({ required })
    const generateBundle = plugin.generateBundle as unknown as GenerateBundle
    generateBundle.call({
      getModuleIds: () => ['/repo/app/src/main/index.ts'][Symbol.iterator](),
      error: (message: string) => {
        throw new Error(message)
      }
    } as unknown as ThisParameterType<GenerateBundle>)
  }

  it('fails a required bundle that contains no npm packages', () => {
    expect(() => runWithoutPackages(true)).toThrow('found no npm packages')
  })

  it('skips other bundles without packages', () => {
    expect(() => runWithoutPackages(false)).not.toThrow()
  })
})
