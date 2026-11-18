import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BUILDER_CONFIGS,
  builtAppSegments,
  sectionValue
} from '../../../scripts/launch-check-target.mjs'
import { appPath } from '../../support/paths'

function yamlFor(environment: string): string {
  const config = BUILDER_CONFIGS.get(environment)
  if (config === undefined) throw new Error(`No installer config for ${environment}.`)
  return readFileSync(appPath(config), 'utf8')
}

describe('builtAppSegments', () => {
  it('finds each environment’s Windows executable', () => {
    for (const [environment, executable] of [
      ['production', 'MouseBucket.exe'],
      ['staging', 'MouseBucket Staging.exe']
    ]) {
      const yaml = yamlFor(environment)
      expect(builtAppSegments({ platform: 'win32', yaml, version: '1.2.3' })).toEqual([
        'win-unpacked',
        executable
      ])
    }
  })

  it('finds each environment’s AppImage at the current version', () => {
    for (const [environment, appImage] of [
      ['production', 'MouseBucket-1.2.3.AppImage'],
      ['staging', 'MouseBucket-Staging-1.2.3.AppImage']
    ]) {
      const yaml = yamlFor(environment)
      expect(builtAppSegments({ platform: 'linux', yaml, version: '1.2.3' })).toEqual([appImage])
    }
  })

  it('knows only the two environments', () => {
    expect([...BUILDER_CONFIGS.keys()]).toEqual(['staging', 'production'])
    expect(BUILDER_CONFIGS.get('toString')).toBeUndefined()
  })
})

describe('sectionValue', () => {
  const yaml = "win:\n  executableName: 'Quoted Name'\nnsis:\n  oneClick: false\n"

  it('reads a key from its own section and drops quotes', () => {
    expect(sectionValue(yaml, 'win', 'executableName')).toBe('Quoted Name')
  })

  it('ignores keys from other sections', () => {
    expect(sectionValue(yaml, 'win', 'oneClick')).toBeUndefined()
    expect(sectionValue(yaml, 'linux', 'executableName')).toBeUndefined()
  })
})
