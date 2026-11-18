// Signs in to Google with the user's own OAuth client: Google's consent page opens in the system browser, and a one-time
// server on this computer's loopback address receives its answer, with PKCE and a random state. See docs/SECURITY.md.
import { randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { CodeChallengeMethod } from 'google-auth-library'
import {
  DRIVE_SCOPE,
  GOOGLE_SIGN_IN_ORIGIN,
  LOOPBACK_HOST,
  SIGN_IN_FAILED_PAGE,
  SIGN_IN_PAGE_HEADERS,
  SIGNED_IN_PAGE
} from '../constants/drive-constants'
import type { CreateSignInClient } from '../types/drive-types'
import { UserError } from '../utils/error-utils'

export class GoogleSignInService {
  private current: AbortController | null = null

  constructor(
    private readonly createClient: CreateSignInClient,
    private readonly openExternal: (url: string) => Promise<void>,
    private readonly timeoutMs: number
  ) {}

  // Returns the refresh token Google gives once the user agrees. One sign-in runs at a time: a new one cancels the last.
  async signIn(clientId: string, clientSecret: string): Promise<string> {
    this.cancel()
    const controller = new AbortController()
    this.current = controller
    const server = createServer()
    try {
      const port = await this.listen(server)
      const redirectUri = `http://${LOOPBACK_HOST}:${port}`
      const client = this.createClient({ clientId, clientSecret, redirectUri })
      const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync()
      const state = randomBytes(32).toString('hex')
      const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [DRIVE_SCOPE],
        state,
        code_challenge: codeChallenge,
        code_challenge_method: CodeChallengeMethod.S256
      })
      if (new URL(authUrl).origin !== GOOGLE_SIGN_IN_ORIGIN) {
        throw new Error('The sign-in page is not Google.')
      }
      const code = this.answer(server, `${LOOPBACK_HOST}:${port}`, state, controller.signal)
      // Failing before the wait is awaited, such as when the browser won't open, must not leave it unhandled.
      code.catch(() => undefined)
      await this.openExternal(authUrl)
      const { tokens } = await client.getToken({
        code: await code,
        codeVerifier,
        redirect_uri: redirectUri
      })
      if (typeof tokens.refresh_token !== 'string' || tokens.refresh_token === '') {
        throw new UserError("Google didn't give a lasting sign-in. Try again.")
      }
      return tokens.refresh_token
    } finally {
      // Stops the wait, if it's still on, with its timer.
      controller.abort()
      server.closeAllConnections()
      server.close()
      if (this.current === controller) this.current = null
    }
  }

  cancel(): void {
    this.current?.abort()
  }

  private listen(server: Server): Promise<number> {
    return new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, LOOPBACK_HOST, () => resolve((server.address() as AddressInfo).port))
    })
  }

  // Waits for Google to send the browser back with a code. Only a request to this exact host, with the state this
  // sign-in made, counts; anything else is turned away, and cancelling or the time running out stops the wait.
  private answer(
    server: Server,
    host: string,
    state: string,
    signal: AbortSignal
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => finish(new UserError('Signing in to Google took too long. Try again.')),
        this.timeoutMs
      )
      const onAbort = (): void => finish(new UserError('Signing in to Google was cancelled.'))
      const finish = (result: string | Error): void => {
        clearTimeout(timer)
        signal.removeEventListener('abort', onAbort)
        server.off('request', onRequest)
        if (typeof result === 'string') resolve(result)
        else reject(result)
      }
      const onRequest = (request: IncomingMessage, response: ServerResponse): void => {
        const url = new URL(request.url ?? '/', `http://${host}`)
        if (request.headers.host !== host || url.pathname !== '/' || request.method !== 'GET') {
          response.writeHead(404, SIGN_IN_PAGE_HEADERS).end()
          return
        }
        const code = url.searchParams.get('code')
        const ok = url.searchParams.get('state') === state && code !== null && code !== ''
        response.writeHead(ok ? 200 : 400, SIGN_IN_PAGE_HEADERS)
        response.end(ok ? SIGNED_IN_PAGE : SIGN_IN_FAILED_PAGE)
        if (ok) finish(code)
        else if (url.searchParams.get('error') === 'access_denied') {
          finish(new UserError("Google sign-in was declined, so the template wasn't saved."))
        } else finish(new UserError("Google's sign-in didn't come back as expected. Try again."))
      }
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort)
      server.on('request', onRequest)
    })
  }
}
