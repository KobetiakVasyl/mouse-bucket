// Compares npm audit's advisories with the reviewed allowlist. See docs/SECURITY.md.
const FAILING_SEVERITIES = new Set(['high', 'critical'])

/**
 * @typedef {{ source?: number, name: string, severity: string, title: string, url?: string }} AuditVia
 * @typedef {{ vulnerabilities?: Record<string, { via: (string | AuditVia)[] }> }} AuditReport
 * @typedef {{ id: string, package: string, severity: string, title: string }} Advisory
 * @typedef {{ id: string, package: string, reason: string }} AllowlistEntry
 */

/**
 * @param {AuditReport} report
 * @returns {Advisory[]}
 */
export function advisoriesFrom(report) {
  /** @type {Map<string, Advisory>} */
  const found = new Map()
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
      if (typeof via === 'string') continue
      const id = via.url ? (via.url.split('/').pop() ?? '') : String(via.source)
      if (!found.has(id)) {
        found.set(id, { id, package: via.name, severity: via.severity, title: via.title })
      }
    }
  }
  return [...found.values()]
}

/**
 * @param {Advisory[]} advisories
 * @param {AllowlistEntry[]} allowlist
 */
export function checkAdvisories(advisories, allowlist) {
  const allowedIds = new Set(allowlist.map((entry) => entry.id))
  const reportedIds = new Set(advisories.map((advisory) => advisory.id))
  return {
    unreviewed: advisories.filter(
      (advisory) => FAILING_SEVERITIES.has(advisory.severity) && !allowedIds.has(advisory.id)
    ),
    allowed: advisories.filter((advisory) => allowedIds.has(advisory.id)),
    stale: allowlist.filter((entry) => !reportedIds.has(entry.id))
  }
}
