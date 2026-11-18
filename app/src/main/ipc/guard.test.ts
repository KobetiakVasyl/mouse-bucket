import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { UserError } from '../errors'
import { isTrustedSender, runHandler } from './guard'

describe('isTrustedSender', () => {
  const built = 'file:///d:/apps/MouseBucket/resources/app.asar/out/renderer/index.html'

  it("trusts the app's own page, with or without a query", () => {
    expect(isTrustedSender(built, built, 'linux')).toBe(true)
    expect(isTrustedSender(`${built}?theme=dark`, built, 'linux')).toBe(true)
    const hotReload = 'http://localhost:5173/'
    expect(isTrustedSender(`${hotReload}?theme=dark`, hotReload, 'win32')).toBe(true)
  })

  it('ignores case in Windows paths only', () => {
    const asChromiumReportsIt = built.replace('file:///d:', 'file:///D:')
    expect(isTrustedSender(asChromiumReportsIt, built, 'win32')).toBe(true)
    expect(isTrustedSender(asChromiumReportsIt, built, 'linux')).toBe(false)
  })

  it('refuses any other page', () => {
    for (const platform of ['win32', 'linux']) {
      expect(isTrustedSender('file:///d:/other/index.html', built, platform)).toBe(false)
      expect(isTrustedSender('https://example.com/', built, platform)).toBe(false)
      expect(isTrustedSender('', built, platform)).toBe(false)
    }
    expect(isTrustedSender('http://localhost:9999/', 'http://localhost:5173/', 'win32')).toBe(false)
  })
})

describe('runHandler', () => {
  const schema = z.object({ name: z.string().min(1, 'Enter a name.') }).strict()

  it('passes a valid payload to the handler', async () => {
    const result = await runHandler(schema, { name: 'x' }, async ({ name }) => name.toUpperCase())
    expect(result).toEqual({ ok: true, value: 'X' })
  })

  it('rejects an invalid payload without calling the handler', async () => {
    let called = false
    const result = await runHandler(schema, { name: '' }, async () => {
      called = true
    })
    expect(result).toEqual({ ok: false, error: 'Enter a name.' })
    expect(called).toBe(false)
  })

  it('turns errors into safe messages', async () => {
    const userError = await runHandler(schema, { name: 'x' }, async () => {
      throw new UserError('Pick a template.')
    })
    expect(userError).toEqual({ ok: false, error: 'Pick a template.' })
    const other = await runHandler(schema, { name: 'x' }, async () => {
      throw new Error('key=AKIA... details')
    })
    expect(other).toEqual({ ok: false, error: 'Something went wrong. Try again.' })
  })
})
