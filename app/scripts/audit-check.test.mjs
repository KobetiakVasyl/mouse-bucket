import { describe, expect, it } from 'vitest'
import { advisoriesFrom, checkAdvisories } from './audit-check.mjs'

/**
 * @param {string} id
 * @param {string} name
 * @param {string} severity
 */
const advisory = (id, name, severity) => ({
  source: 1,
  name,
  severity,
  title: `${name} problem`,
  url: `https://github.com/advisories/${id}`
})

const report = {
  vulnerabilities: {
    picomatch: { via: [advisory('GHSA-high', 'picomatch', 'high')] },
    vite: { via: ['picomatch'] },
    tinyglobby: { via: [advisory('GHSA-high', 'picomatch', 'high')] },
    minimatch: { via: [advisory('GHSA-moderate', 'minimatch', 'moderate')] }
  }
}

describe('advisoriesFrom', () => {
  it('lists each advisory once and skips package-name references', () => {
    expect(advisoriesFrom(report).map((a) => a.id)).toEqual(['GHSA-high', 'GHSA-moderate'])
  })
})

describe('checkAdvisories', () => {
  it('fails on a high advisory that is not allowlisted', () => {
    const { unreviewed } = checkAdvisories(advisoriesFrom(report), [])
    expect(unreviewed.map((a) => a.id)).toEqual(['GHSA-high'])
  })

  it('passes once the high advisory is allowlisted, and ignores moderate ones', () => {
    const allowlist = [{ id: 'GHSA-high', package: 'picomatch', reason: 'reviewed' }]
    const { unreviewed, allowed } = checkAdvisories(advisoriesFrom(report), allowlist)
    expect(unreviewed).toEqual([])
    expect(allowed.map((a) => a.id)).toEqual(['GHSA-high'])
  })

  it('reports allowlist entries that npm no longer reports', () => {
    const allowlist = [{ id: 'GHSA-gone', package: 'old', reason: 'reviewed' }]
    expect(checkAdvisories(advisoriesFrom(report), allowlist).stale).toEqual(allowlist)
  })
})
