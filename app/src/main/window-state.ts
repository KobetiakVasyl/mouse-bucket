// Remembers the window's size, position and maximized state; the first start opens maximized. See docs/UI.md.
import { z } from 'zod'
import { parseJson, readIfExists, writeAtomicallySync } from './store/files'

const Bounds = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
})
export type Bounds = z.infer<typeof Bounds>

const WindowState = z.object({ bounds: Bounds, maximized: z.boolean() })
export type WindowState = z.infer<typeof WindowState>

export interface Placement {
  // null opens the window at its default size, centered.
  bounds: Bounds | null
  maximized: boolean
}

// How much of the window must be on a screen for the saved place to count.
const MIN_VISIBLE = 100

function visibleOn(area: Bounds, bounds: Bounds): boolean {
  const width = Math.min(area.x + area.width, bounds.x + bounds.width) - Math.max(area.x, bounds.x)
  const height =
    Math.min(area.y + area.height, bounds.y + bounds.height) - Math.max(area.y, bounds.y)
  return width >= MIN_VISIBLE && height >= MIN_VISIBLE
}

// The saved place, while it's still on one of the screens; otherwise maximized, as on the first start.
export function windowPlacement(saved: WindowState | null, workAreas: Bounds[]): Placement {
  if (saved === null) return { bounds: null, maximized: true }
  if (!workAreas.some((area) => visibleOn(area, saved.bounds))) {
    return { bounds: null, maximized: true }
  }
  return { bounds: saved.bounds, maximized: saved.maximized }
}

export class WindowStateStore {
  constructor(private readonly path: string) {}

  async load(): Promise<WindowState | null> {
    const raw = await readIfExists(this.path)
    if (raw === undefined) return null
    const parsed = WindowState.safeParse(parseJson(raw.toString('utf8')))
    return parsed.success ? parsed.data : null
  }

  // Synchronous, because it runs while the window closes and the app is about to quit.
  saveSync(state: WindowState): void {
    writeAtomicallySync(this.path, `${JSON.stringify(state, null, 2)}\n`)
  }
}
