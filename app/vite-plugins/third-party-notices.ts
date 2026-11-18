// Writes THIRD_PARTY_NOTICES.txt with the license of every npm package bundled into the app. See docs/PACKAGING.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(-[a-z0-9]+)?(\.(md|markdown|txt|rst))?$/i

export function isLicenseFile(fileName: string): boolean {
  return LICENSE_FILE.test(fileName)
}

export function packageRootOf(moduleId: string): string | undefined {
  const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(moduleId.replace(/\\/g, '/'))
  return match?.[1]?.replace(/^\0/, '')
}

interface Notice {
  name: string
  text: string
  hasLicenseFile: boolean
}

function noticeFor(root: string): Notice {
  const pkg: { name: string; version: string; license?: string } = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8')
  )
  const files = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isLicenseFile(entry.name))
    .map((entry) => entry.name)
    .sort()
  const texts = files.map((file) => readFileSync(join(root, file), 'utf8').trim())
  const header = `${pkg.name}@${pkg.version} (${pkg.license ?? 'license not stated'})`
  const body = texts.length > 0 ? texts : ['No license file in the package.']
  return { name: pkg.name, text: [header, ...body].join('\n\n'), hasLicenseFile: texts.length > 0 }
}

export interface ThirdPartyNoticesOptions {
  // Fail the build when the bundle contains no npm packages, for bundles that always should.
  required?: boolean
}

export function thirdPartyNotices({ required = false }: ThirdPartyNoticesOptions = {}): Plugin {
  return {
    name: 'third-party-notices',
    apply: 'build',
    generateBundle() {
      const roots = new Set<string>()
      for (const id of this.getModuleIds()) {
        const root = packageRootOf(id)
        if (root && existsSync(join(root, 'package.json'))) roots.add(root)
      }
      if (roots.size === 0) {
        if (required) this.error('third-party-notices: found no npm packages in this bundle.')
        return
      }
      const notices = [...roots].sort().map(noticeFor)
      for (const notice of notices) {
        if (!notice.hasLicenseFile)
          this.warn(`third-party-notices: ${notice.name} has no license file.`)
      }
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD_PARTY_NOTICES.txt',
        source: `${notices.map((notice) => notice.text).join(`\n\n${'-'.repeat(72)}\n\n`)}\n`
      })
    }
  }
}
