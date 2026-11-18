// The build's environment, and what decides where the app keeps its data. See docs/ENVIRONMENTS.md.
export type Environment = 'staging' | 'production'

export interface DataDirInputs {
  isPackaged: boolean
  appPath: string
  platform: string
  exePath: string
  appImagePath: string | undefined
}
