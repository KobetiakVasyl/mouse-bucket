import { describe, expect, it } from 'vitest'
import { isSearching, matchesSearch } from '../../../../../src/renderer/src/utils/search-utils'

describe('isSearching and matchesSearch', () => {
  it('needs something besides spaces to search', () => {
    expect(isSearching('')).toBe(false)
    expect(isSearching('   ')).toBe(false)
    expect(isSearching(' a ')).toBe(true)
  })

  it('matches every word, in any order and case, across the texts', () => {
    expect(matchesSearch(['Reports', 's3://example-bucket/'], '')).toBe(true)
    expect(matchesSearch(['Reports', 's3://example-bucket/'], 'REP')).toBe(true)
    expect(matchesSearch(['Reports', 's3://example-bucket/'], ' bucket  reports ')).toBe(true)
    expect(matchesSearch(['Reports', 's3://example-bucket/'], 'reports archive')).toBe(false)
  })
})
