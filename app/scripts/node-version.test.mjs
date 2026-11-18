// Checks that every pinned Node version matches .node-version. See docs/SETUP.md.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** @param {string} path */
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const nodeVersion = read('../../.node-version').trim()

describe('Node version', () => {
  it('matches the engines field in package.json', () => {
    expect(JSON.parse(read('../package.json')).engines.node).toBe(nodeVersion)
  })

  it('matches the Linux container image', () => {
    const fromNode = /^FROM node:([^-@\s]+)-/m.exec(read('../../docker/linux/Dockerfile'))
    expect(fromNode?.[1]).toBe(nodeVersion)
  })
})
