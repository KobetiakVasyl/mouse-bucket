// Matches what's typed in a search box: every word it holds, in any order and case. See docs/UI.md.

export function isSearching(query: string): boolean {
  return query.trim() !== ''
}

export function matchesSearch(texts: string[], query: string): boolean {
  const haystack = texts.join(' ').toLocaleLowerCase()
  return query
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}
