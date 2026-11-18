import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PAPER } from './theme'

const css = readFileSync(new URL('../renderer/src/styles/global.css', import.meta.url), 'utf8')

// The declarations inside the first block whose selector is exactly `selector`.
function block(selector: string): string {
  const match = new RegExp(`^\\s*${selector.replace('.', '\\.')} \\{([^}]*)\\}`, 'm').exec(css)
  return match === null ? '' : match[1]
}

// The value of a custom property in a block, or '' when it's missing.
function property(declarations: string, name: string): string {
  const match = new RegExp(`--${name}: (#[0-9a-f]+);`, 'i').exec(declarations)
  return match === null ? '' : match[1].toLowerCase()
}

function isGray(color: string): boolean {
  const hex = color.slice(1).toLowerCase()
  const [r, g, b] =
    hex.length === 3 ? [...hex] : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)]
  return r === g && g === b
}

describe('theme', () => {
  const light = block(':root')
  const dark = block(':root.dark')

  it('paints the window in the same paper shade as the page', () => {
    expect(property(light, 'paper')).toBe(PAPER.light)
    expect(property(dark, 'paper')).toBe(PAPER.dark)
  })

  it('uses only shades of gray, apart from the danger red', () => {
    const danger = new Set([property(light, 'danger'), property(dark, 'danger')])
    expect(danger.has('')).toBe(false)
    const colors = css.match(/#[0-9a-f]{3,8}\b/gi)
    expect(colors).not.toBeNull()
    const notGray = (colors === null ? [] : colors).filter((color) => !isGray(color))
    expect(notGray.map((color) => color.toLowerCase()).sort()).toEqual([...danger].sort())
  })
})
