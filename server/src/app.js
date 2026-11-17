import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { errorHandler, notFoundHandler } from './lib/errors.js'
import { CSRF_HEADER, createSessions, csrfGuard } from './plugins/security.js'
import accountRoutes from './routes/account.js'
import authRoutes from './routes/auth.js'
import fileRoutes from './routes/files.js'
import linkRoutes from './routes/links.js'
import searchRoutes from './routes/search.js'

export const API_PREFIX = '/api/v1'

export async function buildApp({ config, db, logger }) {
  const app = Fastify({
    logger: logger ?? {
      level: config.logLevel,
      // Session cookies and anything password-like must never reach the logs.
      redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]', '*.password'],
    },
    bodyLimit: 64 * 1024,
    trustProxy: config.isProduction,
  })

  app.setErrorHandler(errorHandler)
  app.setNotFoundHandler(notFoundHandler)

  await app.register(helmet)
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', CSRF_HEADER],
  })
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' })
  await app.register(cookie)
  await app.register(multipart)

  app.addHook('onRequest', csrfGuard(config))

  app.get('/health', { config: { rateLimit: false } }, async () => ({ status: 'ok' }))

  const sessions = createSessions(db, config)
  const deps = { db, config, sessions }
  await app.register(
    async (api) => {
      await api.register(authRoutes, deps)
      await api.register(accountRoutes, deps)
      await api.register(fileRoutes, deps)
      await api.register(linkRoutes, deps)
      await api.register(searchRoutes, deps)
    },
    { prefix: API_PREFIX },
  )

  return app
}
