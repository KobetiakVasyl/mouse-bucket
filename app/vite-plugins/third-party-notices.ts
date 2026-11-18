// Writes THIRD_PARTY_NOTICES.txt with the license of every npm package and listed asset bundled into the app. See docs/PACKAGING.md.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(-[a-z0-9]+)?(\.(md|markdown|txt|rst))?$/i
const SEPARATOR = `\n\n${'-'.repeat(72)}\n\n`

export function isLicenseFile(fileName: string): boolean {
  return LICENSE_FILE.test(fileName)
}

export function packageRootOf(moduleId: string): string | null {
  const match = /^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(moduleId.replace(/\\/g, '/'))
  return match === null ? null : match[1].replace(/^\0/, '')
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
  const license = pkg.license === undefined ? 'license not stated' : pkg.license
  const header = `${pkg.name}@${pkg.version} (${license})`
  const body = texts.length > 0 ? texts : ['No license file in the package.']
  return { name: pkg.name, text: [header, ...body].join('\n\n'), hasLicenseFile: texts.length > 0 }
}

// A file bundled from the app's own source that carries its own license, such as a font.
export interface BundledAsset {
  // For example "Montserrat font 5.3.0 (OFL-1.1)".
  title: string
  licenseFile: string
}

function assetNotice({ title, licenseFile }: BundledAsset): Notice {
  const text = readFileSync(licenseFile, 'utf8').trim()
  return { name: title, text: `${title}\n\n${text}`, hasLicenseFile: true }
}

export interface ThirdPartyNoticesOptions {
  // Fail the build when the bundle contains no npm packages, for bundles that always should.
  required?: boolean
  assets?: BundledAsset[]
}

export function thirdPartyNotices({
  required = false,
  assets = []
}: ThirdPartyNoticesOptions = {}): Plugin {
  return {
    name: 'third-party-notices',
    apply: 'build',
    generateBundle() {
      const roots = new Set<string>()
      for (const id of this.getModuleIds()) {
        const root = packageRootOf(id)
        if (root !== null && existsSync(join(root, 'package.json'))) roots.add(root)
      }
      if (roots.size === 0 && required) {
        this.error('third-party-notices: found no npm packages in this bundle.')
      }
      const packages = [...roots].sort().map(noticeFor)
      for (const notice of packages) {
        if (!notice.hasLicenseFile) {
          this.warn(`third-party-notices: ${notice.name} has no license file.`)
        }
      }
      const notices = [...packages, ...assets.map(assetNotice)]
      if (notices.length === 0) return
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD_PARTY_NOTICES.txt',
        source: `${notices.map((notice) => notice.text).join(SEPARATOR)}\n`
      })
    }
  }
}
