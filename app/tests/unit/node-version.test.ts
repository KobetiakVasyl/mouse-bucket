// Checks that every pinned Node version matches .node-version. See docs/SETUP.md.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { appPath, repoPath } from '../support/paths'

const nodeVersion = readFileSync(repoPath('.node-version'), 'utf8').trim()

describe('Node version', () => {
  it('matches the engines field in package.json', () => {
    const pkg: { engines: { node: string } } = JSON.parse(
      readFileSync(appPath('package.json'), 'utf8')
    )
    expect(pkg.engines.node).toBe(nodeVersion)
  })

  it('matches the Linux container image', () => {
    const dockerfile = readFileSync(repoPath('docker/linux/Dockerfile'), 'utf8')
    const fromNode = /^FROM node:([^-@\s]+)-/m.exec(dockerfile)
    expect(fromNode === null ? '' : fromNode[1]).toBe(nodeVersion)
  })
})
