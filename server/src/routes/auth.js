import { z } from 'zod'
import { hashPassword, verifyPassword } from '../lib/crypto.js'
import { unauthorized } from '../lib/errors.js'
import { toUser } from '../lib/serializers.js'

const loginBody = z.object({
  email: z.string({ error: 'Informe o e-mail.' }).trim().min(1, 'Informe o e-mail.').max(254),
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(1024),
})

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.'

export default async function authRoutes(app, { db, sessions }) {
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
  // Verifying against a real hash when the e-mail does not exist keeps response time the same,
  // so timing does not reveal which e-mails have accounts.
  const dummyHash = await hashPassword('vaultshare-timing-equalizer')

  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          hook: 'preHandler',
          // Keyed on the account only: behind the Vercel proxy request.ip is a rotating edge address,
          // so an IP-based key would give each guess a fresh budget.
          keyGenerator: (request) => String(request.body?.email ?? '').trim().toLowerCase(),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = loginBody.parse(request.body)
      const user = findByEmail.get(email)
      const valid = await verifyPassword(user?.password_hash ?? dummyHash, password)
      if (!user || !valid) throw unauthorized(INVALID_CREDENTIALS)

      sessions.start(reply, user.id)
      return toUser(user)
    },
  )

  app.post('/auth/logout', async (request, reply) => {
    sessions.end(request, reply)
    return reply.status(204).send()
  })
}
