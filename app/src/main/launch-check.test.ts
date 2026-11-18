import { EventEmitter } from 'node:events'
import { describe, expect, it, type Mock, vi } from 'vitest'
import { LaunchCheckExit, waitUntilRendered, watchLaunch } from './launch-check'

describe('waitUntilRendered', () => {
  it('passes as soon as the page has rendered', async () => {
    let calls = 0
    const rendered = await waitUntilRendered(async () => ++calls >= 3, 5, 0)
    expect(rendered).toBe(true)
    expect(calls).toBe(3)
  })

  it('gives up after the last attempt', async () => {
    let calls = 0
    const rendered = await waitUntilRendered(
      async () => {
        calls++
        return false
      },
      4,
      0
    )
    expect(rendered).toBe(false)
    expect(calls).toBe(4)
  })
})

describe('watchLaunch', () => {
  type Contents = Parameters<typeof watchLaunch>[0]

  interface Launch {
    contents: EventEmitter
    exit: Mock<(code: number) => void>
  }

  function launch(executeJavaScript: () => Promise<unknown>, timeoutMs = 5_000): Launch {
    const contents = Object.assign(new EventEmitter(), { executeJavaScript })
    const exit = vi.fn<(code: number) => void>()
    watchLaunch(contents as unknown as Contents, exit, { timeoutMs, attempts: 3, delayMs: 0 })
    return { contents, exit }
  }

  async function exitCodes(exit: Launch['exit']): Promise<number[]> {
    await vi.waitFor(() => expect(exit).toHaveBeenCalled())
    return exit.mock.calls.map(([code]) => code)
  }

  it('exits with rendered once the page has rendered', async () => {
    const { contents, exit } = launch(async () => true)
    contents.emit('did-finish-load')
    expect(await exitCodes(exit)).toEqual([LaunchCheckExit.rendered])
  })

  it('exits with notRendered when the page stays empty', async () => {
    const { contents, exit } = launch(async () => false)
    contents.emit('did-finish-load')
    expect(await exitCodes(exit)).toEqual([LaunchCheckExit.notRendered])
  })

  it('exits with notRendered when the page can no longer be asked', async () => {
    const { contents, exit } = launch(() => Promise.reject(new Error('Render frame was disposed')))
    contents.emit('did-finish-load')
    expect(await exitCodes(exit)).toEqual([LaunchCheckExit.notRendered])
  })

  it('exits with rendererGone when the renderer crashes', async () => {
    const { contents, exit } = launch(async () => true)
    contents.emit('render-process-gone')
    expect(await exitCodes(exit)).toEqual([LaunchCheckExit.rendererGone])
  })

  it('exits with loadFailed when the page fails to load, but not for a subframe', async () => {
    const { contents, exit } = launch(async () => true)
    contents.emit('did-fail-load', {}, -6, 'ERR_FILE_NOT_FOUND', 'file:///frame.html', false)
    expect(exit).not.toHaveBeenCalled()
    contents.emit('did-fail-load', {}, -6, 'ERR_FILE_NOT_FOUND', 'file:///index.html', true)
    expect(await exitCodes(exit)).toEqual([LaunchCheckExit.loadFailed])
  })

  it('exits with timedOut when nothing happens in time', async () => {
    const { exit } = launch(async () => true, 5)
    expect(await exitCodes(exit)).toEqual([LaunchCheckExit.timedOut])
  })

  it('reports only the first outcome', async () => {
    const { contents, exit } = launch(async () => true, 50)
    contents.emit('did-finish-load')
    await exitCodes(exit)
    contents.emit('render-process-gone')
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(await exitCodes(exit)).toEqual([LaunchCheckExit.rendered])
  })
})
