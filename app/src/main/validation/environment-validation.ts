// Checks that a build mode names one of the two environments. See docs/ENVIRONMENTS.md.
import { ENVIRONMENTS } from '../constants/app-constants'
import type { Environment } from '../types/environment-types'

export function isEnvironment(mode: string): mode is Environment {
  return ENVIRONMENTS.has(mode)
}
