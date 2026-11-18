import { describe, expect, it } from 'vitest'
import { canUpdate, describeUpdateError } from '../../../../src/main/utils/update-utils'

describe('canUpdate', () => {
  it('updates the Windows install and the AppImage, not a run from source', () => {
    expect(canUpdate({ isPackaged: true, platform: 'win32', appImagePath: undefined })).toBe(true)
    expect(
      canUpdate({ isPackaged: true, platform: 'linux', appImagePath: '/apps/M.AppImage' })
    ).toBe(true)
    expect(canUpdate({ isPackaged: true, platform: 'linux', appImagePath: undefined })).toBe(false)
    expect(canUpdate({ isPackaged: false, platform: 'win32', appImagePath: undefined })).toBe(false)
    expect(canUpdate({ isPackaged: true, platform: 'darwin', appImagePath: undefined })).toBe(false)
  })
})

describe('describeUpdateError', () => {
  it("explains electron-updater's codes and network errors, and hides anything else", () => {
    const coded = (code: string): Error => Object.assign(new Error('raw details'), { code })
    expect(describeUpdateError(coded('ERR_UPDATER_NO_PUBLISHED_VERSIONS'))).toBe(
      'No version has been published yet.'
    )
    expect(describeUpdateError(coded('ECONNRESET'))).toContain("Couldn't reach GitHub")
    expect(describeUpdateError(new Error('token=secret'))).toBe(
      'The update failed. Try again later.'
    )
  })
})
