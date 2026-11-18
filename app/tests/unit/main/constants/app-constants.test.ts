import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_ID, PRODUCT_NAME } from '../../../../src/main/constants/app-constants'
import { EnvironmentService } from '../../../../src/main/services/environment-service'
import { appPath } from '../../../support/paths'

const STAGING = new EnvironmentService('staging')

const read = (path: string): string => readFileSync(appPath(path), 'utf8')

// A top-level YAML value, or '' when the key is missing.
function topLevel(yaml: string, key: string): string {
  const match = new RegExp(`^${key}:[ \\t]*(.+)$`, 'm').exec(yaml)
  return match === null ? '' : match[1].trim()
}

// A value inside a top-level YAML section, or '' when either is missing.
function nested(yaml: string, section: string, key: string): string {
  const block = new RegExp(`^${section}:\\r?\\n((?:[ \\t]+.*\\r?\\n?)*)`, 'm').exec(yaml)
  if (block === null) return ''
  const match = new RegExp(`^[ \\t]+${key}:[ \\t]*(.+)$`, 'm').exec(block[1])
  return match === null ? '' : match[1].trim()
}

describe('app identity', () => {
  const pkg: { name: string; productName: string } = JSON.parse(read('package.json'))
  const production = read('electron-builder.yml')
  const staging = read('electron-builder.staging.yml')

  it("matches the app's names in package.json", () => {
    expect(pkg.productName).toBe(PRODUCT_NAME)
  })

  it("matches the app's names in the production installer config", () => {
    expect(topLevel(production, 'appId')).toBe(APP_ID)
    expect(topLevel(production, 'productName')).toBe(PRODUCT_NAME)
    expect(nested(production, 'win', 'executableName')).toBe(PRODUCT_NAME)
  })

  it("matches the app's names in the staging installer config", () => {
    expect(topLevel(staging, 'extends')).toBe('./electron-builder.yml')
    expect(topLevel(staging, 'appId')).toBe(STAGING.appId)
    expect(topLevel(staging, 'productName')).toBe(STAGING.productName)
    expect(nested(staging, 'win', 'executableName')).toBe(STAGING.productName)
  })

  it('gives staging installers their own package name', () => {
    expect(nested(staging, 'extraMetadata', 'name')).toBe(`${pkg.name}-staging`)
  })
})
