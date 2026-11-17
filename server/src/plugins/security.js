import { forbidden, unauthorized } from '../lib/errors.js'
import { newSessionToken, sha256 } from '../lib/crypto.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
export const CSRF_HEADER = 'x-requested-with'
export const CSRF_VALUE = 'VaultShare'

export const sessionCookieName = (config) => (config.isProduction ? '__Host-vs_session' : 'vs_session')

// CSRF defense in depth for a cookie session:
// 1. SameSite=Lax on the cookie;
// 2. a custom header on every write, which a cross-site form cannot send and cross-site fetch cannot send without CORS approval;
// 3. Origin / Sec-Fetch-Site checks when the browser provides them.
export function csrfGuard(config) {
  const isAllowed = (origin) =>
    config.corsOrigins.some((allowed) => (typeof allowed === 'string' ? allowed === origin : allowed.test(origin)))
  return async (request) => {
    if (SAFE_METHODS.has(request.method)) return
    const origin = request.headers.origin
    if (origin && !isAllowed(origin)) throw forbidden('Origem não permitida.')
    if (request.headers['sec-fetch-site'] === 'cross-site') throw forbidden('Origem não permitida.')
    if (request.headers[CSRF_HEADER] !== CSRF_VALUE) throw forbidden('Requisição sem o cabeçalho de segurança.')
  }
}

export function createSessions(db, config) {
  const cookieName = sessionCookieName(config)
  const cookieOptions = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  }

  const findSession = db.prepare(`
    SELECT users.* FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `)
  const insertSession = db.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  )
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
  const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?')

  return {
    // Only the SHA-256 of the token is stored: a leaked database does not leak live sessions.
    start(reply, userId) {
      const now = Date.now()
      deleteExpired.run(new Date(now).toISOString())
      const token = newSessionToken()
      const expiresAt = new Date(now + config.sessionTtlMs)
      insertSession.run(sha256(token), userId, expiresAt.toISOString(), new Date(now).toISOString())
      reply.setCookie(cookieName, token, { ...cookieOptions, expires: expiresAt })
    },

    end(request, reply) {
      const token = request.cookies[cookieName]
      if (token) deleteSession.run(sha256(token))
      reply.clearCookie(cookieName, cookieOptions)
    },

    // preHandler for every protected route: sets request.user or answers 401.
    require: async (request) => {
      const token = request.cookies[cookieName]
      const user = token ? findSession.get(sha256(token), new Date().toISOString()) : undefined
      if (!user) throw unauthorized()
      request.user = user
    },
  }
}
