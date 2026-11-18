// Works out which built app in dist/ the launch check starts, from the environment's installer config. See docs/ENVIRONMENTS.md.

export const BUILDER_CONFIGS = new Map([
  ['staging', 'electron-builder.staging.yml'],
  ['production', 'electron-builder.yml']
])

/**
 * Reads `key:` inside the top-level `section:` of an electron-builder YAML file.
 * @param {string} yaml
 * @param {string} section
 * @param {string} key
 * @returns {string | undefined}
 */
export function sectionValue(yaml, section, key) {
  const block = new RegExp(`^${section}:\\r?\\n((?:[ \\t]+.*\\r?\\n?)*)`, 'm').exec(yaml)?.[1]
  const value = block && new RegExp(`^[ \\t]+${key}:[ \\t]*(.+)$`, 'm').exec(block)?.[1]
  return value?.trim().replace(/^(['"])(.*)\1$/, '$2')
}

/**
 * The built app's path inside dist/, as path segments.
 * @param {{ platform: string, yaml: string, version: string }} inputs
 * @returns {string[] | undefined}
 */
export function builtAppSegments({ platform, yaml, version }) {
  if (platform === 'win32') {
    const executable = sectionValue(yaml, 'win', 'executableName')
    return executable ? ['win-unpacked', `${executable}.exe`] : undefined
  }
  const artifact = sectionValue(yaml, 'appImage', 'artifactName')
  return artifact
    ? [artifact.replace('${version}', version).replace('${ext}', 'AppImage')]
    : undefined
}
