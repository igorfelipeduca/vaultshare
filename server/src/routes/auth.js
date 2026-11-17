import { z } from 'zod'
import { hashPassword, newId, verifyPassword } from '../lib/crypto.js'
import { conflict, unauthorized } from '../lib/errors.js'
import { toUser } from '../lib/serializers.js'

const loginBody = z.object({
  email: z.string({ error: 'Informe o e-mail.' }).trim().min(1, 'Informe o e-mail.').max(254),
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.').max(1024),
})

const registerBody = z.object({
  name: z
    .string({ error: 'Informe seu nome.' })
    .trim()
    .min(1, 'Informe seu nome.')
    .max(100, 'Use no máximo 100 caracteres.'),
  email: z.email({ error: 'Informe um e-mail válido.' }).trim().max(254, 'E-mail longo demais.'),
  password: z
    .string({ error: 'Crie uma senha.' })
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .max(128, 'Use no máximo 128 caracteres.'),
})

const EMAIL_TAKEN = 'Já existe uma conta com este e-mail.'

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.'

export default async function authRoutes(app, { db, sessions }) {
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
  const insertUser = db.prepare(
    'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *',
  )
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
          keyGenerator: (request) =>
            String(request.body?.email ?? '')
              .trim()
              .toLowerCase(),
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

  // One shared bucket for every sign-up: behind the Vercel proxy request.ip rotates, so a per-IP limit would not
  // stop mass account creation.
  const registerLimit = { max: 30, timeWindow: '1 minute', keyGenerator: () => 'register' }

  app.post('/auth/register', { config: { rateLimit: registerLimit } }, async (request, reply) => {
    const { name, email, password } = registerBody.parse(request.body)
    if (findByEmail.get(email)) throw conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN })

    let user
    try {
      user = insertUser.get(newId(), name, email, await hashPassword(password), new Date().toISOString())
    } catch (error) {
      // Two sign-ups racing for the same e-mail: the UNIQUE index rejects the second one.
      if (String(error.message).includes('UNIQUE')) throw conflict(EMAIL_TAKEN, { email: EMAIL_TAKEN })
      throw error
    }

    sessions.start(reply, user.id)
    return reply.status(201).send(toUser(user))
  })

  app.post('/auth/logout', async (request, reply) => {
    sessions.end(request, reply)
    return reply.status(204).send()
  })
}
