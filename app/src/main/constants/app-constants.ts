// The production name and ID, and the two environments. app/electron-builder.yml and electron-builder.staging.yml must match. See docs/ENVIRONMENTS.md.
export const PRODUCT_NAME = 'MouseBucket'
export const APP_ID = 'io.github.kobetiakvasyl.mousebucket'

export const ENVIRONMENTS: ReadonlySet<string> = new Set(['staging', 'production'])
