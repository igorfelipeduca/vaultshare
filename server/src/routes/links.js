import { z } from 'zod'
import { hashPassword, newId, newLinkSlug } from '../lib/crypto.js'
import { transaction } from '../db.js'
import { badRequest, notFound } from '../lib/errors.js'
import { logEvent } from '../lib/events.js'
import { toLink } from '../lib/serializers.js'

const DAY_MS = 24 * 60 * 60 * 1000

const createBody = z.object({
  fileId: z.string({ error: 'Escolha um arquivo.' }).min(1, 'Escolha um arquivo.').max(64),
  expiresInDays: z.union([z.literal(1), z.literal(7), z.literal(30), z.null()], {
    error: 'Escolha 1, 7 ou 30 dias, ou sem expiração.',
  }),
  password: z
    .string()
    .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
    .max(128, 'Use no máximo 128 caracteres.')
    .nullable(),
})

const LINK_COLUMNS = 'links.*, files.name AS file_name'

export default async function linkRoutes(app, { db, config, sessions }) {
  app.addHook('preHandler', sessions.require)

  const list = db.prepare(
    `SELECT ${LINK_COLUMNS} FROM links JOIN files ON files.id = links.file_id WHERE links.user_id = ? ORDER BY links.created_at DESC`,
  )
  const findFile = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?')
  const insert = db.prepare(`
    INSERT INTO links (id, user_id, file_id, slug, password_hash, expires_at, read_only, access_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?) RETURNING *
  `)

  app.get('/links', async (request) => list.all(request.user.id).map((row) => toLink(row, config.publicLinkHost)))

  app.post('/links', async (request, reply) => {
    const input = createBody.parse(request.body)
    const user = request.user

    // Filtering by user_id means another user's file is indistinguishable from a missing one.
    const file = findFile.get(input.fileId, user.id)
    if (!file) throw notFound('Arquivo não encontrado.')

    if (user.require_password && input.password === null) {
      throw badRequest('Sua conta exige senha em novos links.', { password: 'Informe uma senha' })
    }

    const passwordHash = input.password === null ? null : await hashPassword(input.password)
    const now = Date.now()
    const expiresAt = input.expiresInDays === null ? null : new Date(now + input.expiresInDays * DAY_MS).toISOString()

    const row = transaction(db, () => {
      const link = insert.get(
        newId(),
        user.id,
        file.id,
        newLinkSlug(),
        passwordHash,
        expiresAt,
        new Date(now).toISOString(),
      )
      logEvent(db, { userId: user.id, type: 'link_created', fileName: file.name })
      return link
    })
    return reply.status(201).send(toLink({ ...row, file_name: file.name }, config.publicLinkHost))
  })
}
