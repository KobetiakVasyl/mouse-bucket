import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { appId, productName } from './environment'

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8')

function topLevel(yaml: string, key: string): string | undefined {
  return new RegExp(`^${key}:[ \\t]*(.+)$`, 'm').exec(yaml)?.[1]?.trim()
}

function nested(yaml: string, section: string, key: string): string | undefined {
  const block = new RegExp(`^${section}:\\r?\\n((?:[ \\t]+.*\\r?\\n?)*)`, 'm').exec(yaml)?.[1]
  return block && new RegExp(`^[ \\t]+${key}:[ \\t]*(.+)$`, 'm').exec(block)?.[1]?.trim()
}

describe('app identity', () => {
  const pkg: { name: string; productName: string } = JSON.parse(read('package.json'))
  const production = read('electron-builder.yml')
  const staging = read('electron-builder.staging.yml')

  it('matches environment.ts in package.json', () => {
    expect(pkg.productName).toBe(productName('production'))
  })

  it('matches environment.ts in the production installer config', () => {
    expect(topLevel(production, 'appId')).toBe(appId('production'))
    expect(topLevel(production, 'productName')).toBe(productName('production'))
    expect(nested(production, 'win', 'executableName')).toBe(productName('production'))
  })

  it('matches environment.ts in the staging installer config', () => {
    expect(topLevel(staging, 'extends')).toBe('./electron-builder.yml')
    expect(topLevel(staging, 'appId')).toBe(appId('staging'))
    expect(topLevel(staging, 'productName')).toBe(productName('staging'))
    expect(nested(staging, 'win', 'executableName')).toBe(productName('staging'))
  })

  it('gives staging installers their own package name', () => {
    expect(nested(staging, 'extraMetadata', 'name')).toBe(`${pkg.name}-staging`)
  })
})
