import { request } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { GoogleSignInService } from '../../../../src/main/services/google-sign-in-service'
import type { CreateSignInClient, SignInClient } from '../../../../src/main/types/drive-types'

interface Setup {
  google: GoogleSignInService
  client: { [K in keyof SignInClient]: ReturnType<typeof vi.fn> }
  pages: string[]
}

// A browser that, once Google is done, sends the user back to the redirect address with `answer` added.
function setup(
  answer: (state: string) => string,
  options: {
    timeoutMs?: number
    browse?: boolean
    authUrl?: string
    // Runs in the browser before it goes back to the app, with the address it goes back to.
    before?: (redirectUri: string) => Promise<void>
  } = {}
): Setup {
  const pages: string[] = []
  let redirectUri = ''
  const client = {
    generateCodeVerifierAsync: vi.fn(async () => ({
      codeVerifier: 'verifier',
      codeChallenge: 'challenge'
    })),
    generateAuthUrl: vi.fn(
      (params: { state: string }) =>
        options.authUrl ?? `https://accounts.google.com/o/oauth2/v2/auth?state=${params.state}`
    ),
    getToken: vi.fn(async () => ({ tokens: { refresh_token: 'refresh-1' } }))
  }
  const createClient: CreateSignInClient = (clientOptions) => {
    redirectUri = clientOptions.redirectUri
    return client as unknown as SignInClient
  }
  const openExternal = async (url: string): Promise<void> => {
    if (options.browse === false) return
    await options.before?.(redirectUri)
    const state = new URL(url).searchParams.get('state') ?? ''
    const response = await fetch(`${redirectUri}/?${answer(state)}`)
    pages.push(await response.text())
  }
  const google = new GoogleSignInService(createClient, openExternal, options.timeoutMs ?? 5000)
  return { google, client, pages }
}

// Sends a request to the loopback server with another Host header, as a rebinding attack would.
function requestWithHost(url: string, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    request(
      { host: target.hostname, port: target.port, path: '/?code=x', headers: { host } },
      (response) => {
        response.resume()
        resolve(response.statusCode ?? 0)
      }
    )
      .on('error', reject)
      .end()
  })
}

describe('GoogleSignInService', () => {
  it('signs in with PKCE and a state, and returns the refresh token Google gives', async () => {
    const { google, client, pages } = setup((state) => `code=the-code&state=${state}`)
    expect(await google.signIn('id.apps.googleusercontent.com', 'secret')).toBe('refresh-1')
    expect(client.generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        access_type: 'offline',
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/drive'],
        code_challenge: 'challenge',
        code_challenge_method: 'S256'
      })
    )
    expect(client.getToken).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'the-code', codeVerifier: 'verifier' })
    )
    expect(client.getToken.mock.calls[0][0].redirect_uri).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
    expect(pages[0]).toContain('You can close this tab')
  })

  it('fails on a wrong state, and says when the user declined', async () => {
    await expect(setup(() => 'code=x&state=forged').google.signIn('id', 's')).rejects.toThrow(
      "didn't come back as expected"
    )
    await expect(
      setup((state) => `error=access_denied&state=${state}`).google.signIn('id', 's')
    ).rejects.toThrow('declined')
  })

  it('turns away a request for another host, as from a page that rebinds its name', async () => {
    let turnedAway = 0
    const { google } = setup((state) => `code=ok&state=${state}`, {
      before: async (redirectUri) => {
        turnedAway = await requestWithHost(redirectUri, 'evil.example')
      }
    })
    expect(await google.signIn('id', 's')).toBe('refresh-1')
    expect(turnedAway).toBe(404)
  })

  it('gives up after its time, and when cancelled', async () => {
    await expect(
      setup(() => '', { browse: false, timeoutMs: 50 }).google.signIn('id', 's')
    ).rejects.toThrow('took too long')
    const { google } = setup(() => '', { browse: false })
    const signingIn = google.signIn('id', 's')
    setTimeout(() => google.cancel(), 20)
    await expect(signingIn).rejects.toThrow('cancelled')
  })

  it('opens nothing but Google’s own sign-in page', async () => {
    const { google } = setup(() => '', { authUrl: 'https://example.com/auth' })
    await expect(google.signIn('id', 's')).rejects.toThrow('not Google')
  })

  it('refuses a sign-in that gives no lasting token', async () => {
    const { google, client } = setup((state) => `code=c&state=${state}`)
    client.getToken.mockResolvedValueOnce({ tokens: {} })
    await expect(google.signIn('id', 's')).rejects.toThrow('lasting sign-in')
  })
})
