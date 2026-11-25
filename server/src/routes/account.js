import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../lib/crypto.js'
import { badRequest, conflict } from '../lib/errors.js'
import { toEvent, toFile, toLink, toPerson, toSettings, toUser } from '../lib/serializers.js'

const profileBody = z.object({
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(1, 'Informe o nome.')
    .max(100, 'Use no máximo 100 caracteres.'),
  email: z.email({ error: 'Informe um e-mail válido.' }).trim().max(254, 'E-mail longo demais.'),
})

const settingsBody = z.object({
  requirePassword: z.boolean({ error: 'Valor inválido.' }),
  notifyAccess: z.boolean({ error: 'Valor inválido.' }),
  allowAccessRequests: z.boolean({ error: 'Valor inválido.' }),
})

const activityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const deleteBody = z.object({
  password: z.string({ error: 'Confirme com sua senha.' }).min(1, 'Confirme com sua senha.').max(1024),
})

const passwordBody = z.object({
  currentPassword: z
    .string({ error: 'Informe a senha atual.' })
    .min(1, 'Informe a senha atual.')
    .max(1024, 'Senha longa demais.'),
  newPassword: z
    .string({ error: 'Informe a nova senha.' })
    .min(8, 'Use pelo menos 8 caracteres.')
    .max(128, 'Use no máximo 128 caracteres.'),
})

const DAY_MS = 24 * 60 * 60 * 1000

export default async function accountRoutes(app, { db, config, sessions }) {
  app.addHook('preHandler', sessions.require)

  const statements = {
    emailTaken: db.prepare('SELECT 1 FROM users WHERE email = ? AND id <> ?'),
    updateProfile: db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING *'),
    updateSettings: db.prepare(
      'UPDATE users SET require_password = ?, notify_access = ?, allow_access_requests = ? WHERE id = ? RETURNING *',
    ),
    storage: db.prepare('SELECT COUNT(*) AS files, COALESCE(SUM(size_bytes), 0) AS used FROM files WHERE user_id = ?'),
    activeLinks: db.prepare(
      'SELECT COUNT(*) AS n FROM links WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)',
    ),
    recentAccesses: db.prepare(
      "SELECT COUNT(*) AS n FROM events WHERE user_id = ? AND type = 'file_accessed' AND created_at > ?",
    ),
    activity: db.prepare('SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
    exportFiles: db.prepare('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC'),
    exportLinks: db.prepare(
      'SELECT links.*, files.name AS file_name FROM links JOIN files ON files.id = links.file_id WHERE links.user_id = ? ORDER BY links.created_at DESC',
    ),
    exportEvents: db.prepare('SELECT * FROM events WHERE user_id = ? ORDER BY created_at DESC'),
    exportContacts: db.prepare('SELECT * FROM contacts WHERE user_id = ? ORDER BY name'),
    activeSessions: db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?'),
    storageKeys: db.prepare('SELECT storage_key FROM files WHERE user_id = ? AND storage_key IS NOT NULL'),
    updatePassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
    notifications: db.prepare(
      "SELECT * FROM events WHERE user_id = ? AND (? OR type <> 'file_accessed') ORDER BY created_at DESC LIMIT 5",
    ),
  }

  app.get('/me', async (request) => toUser(request.user))

  app.patch('/me', async (request) => {
    const { name, email } = profileBody.parse(request.body)
    if (statements.emailTaken.get(email, request.user.id)) {
      throw conflict('Este e-mail já está em uso por outra conta.', { email: 'E-mail já cadastrado' })
    }
    return toUser(statements.updateProfile.get(name, email, request.user.id))
  })

  app.get('/me/settings', async (request) => toSettings(request.user))

  app.put('/me/settings', async (request) => {
    const next = settingsBody.parse(request.body)
    const row = statements.updateSettings.get(
      Number(next.requirePassword),
      Number(next.notifyAccess),
      Number(next.allowAccessRequests),
      request.user.id,
    )
    return toSettings(row)
  })

  app.get('/overview', async (request) => {
    const userId = request.user.id
    const now = Date.now()
    const storage = statements.storage.get(userId)
    return {
      storageUsedBytes: storage.used,
      storageQuotaBytes: request.user.storage_quota_bytes,
      protectedFiles: storage.files,
      activeLinks: statements.activeLinks.get(userId, new Date(now).toISOString()).n,
      recentAccesses: statements.recentAccesses.get(userId, new Date(now - 7 * DAY_MS).toISOString()).n,
    }
  })

  app.get('/activity', async (request) => {
    const { limit } = activityQuery.parse(request.query)
    // SQLite treats LIMIT -1 as "no limit".
    return statements.activity.all(request.user.id, limit ?? -1).map(toEvent)
  })

  app.get('/notifications', async (request) =>
    statements.notifications.all(request.user.id, request.user.notify_access).map(toEvent),
  )

  // LGPD art. 18, II and V: confirmation, access and portability. A structured, machine-readable copy of everything
  // stored about the account. Password and link hashes and storage paths are never included.
  app.get('/me/export', async (request, reply) => {
    const user = request.user
    const data = {
      exportedAt: new Date().toISOString(),
      account: { ...toUser(user), createdAt: user.created_at, storageQuotaBytes: user.storage_quota_bytes },
      settings: toSettings(user),
      files: statements.exportFiles.all(user.id).map(toFile),
      links: statements.exportLinks.all(user.id).map((row) => toLink(row, config.publicLinkHost)),
      activity: statements.exportEvents.all(user.id).map(toEvent),
      contacts: statements.exportContacts.all(user.id).map(toPerson),
      activeSessions: statements.activeSessions.get(user.id, new Date().toISOString()).n,
    }
    reply.header('Content-Disposition', 'attachment; filename="vaultshare-meus-dados.json"')
    reply.header('Cache-Control', 'no-store')
    return data
  })

  // Re-authenticates with the current password and signs out every other device, so whoever knew the old
  // password loses access right away (LGPD art. 46: security measures).
  app.put('/me/password', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { currentPassword, newPassword } = passwordBody.parse(request.body)
    const user = request.user
    if (!(await verifyPassword(user.password_hash, currentPassword)))
      throw badRequest('Senha atual incorreta.', { currentPassword: 'Senha incorreta' })
    if (newPassword === currentPassword)
      throw badRequest('A nova senha precisa ser diferente da atual.', { newPassword: 'Igual à senha atual' })
    if (newPassword.trim().toLowerCase() === user.email.toLowerCase())
      throw badRequest('Não use seu e-mail como senha.', { newPassword: 'Igual ao seu e-mail' })

    statements.updatePassword.run(await hashPassword(newPassword), user.id)
    sessions.endOthers(request, user.id)
    return reply.status(204).send()
  })

  // Ends the sessions of every other browser or device (e.g. a computer left signed in somewhere else).
  app.delete('/me/sessions', async (request) => ({ ended: sessions.endOthers(request, request.user.id) }))

  // LGPD art. 18, VI: deletion. Re-authenticates with the password, removes every row (ON DELETE CASCADE)
  // and the encrypted files on disk, then ends the session.
  app.delete('/me', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const { password } = deleteBody.parse(request.body)
    const user = request.user
    if (!(await verifyPassword(user.password_hash, password)))
      throw badRequest('Senha incorreta.', { password: 'Senha incorreta' })

    const keys = statements.storageKeys.all(user.id).map((row) => row.storage_key)
    statements.deleteUser.run(user.id)
    await Promise.all(keys.map((key) => rm(join(config.storageDir, key), { force: true })))
    request.log.info({ userId: user.id }, 'account deleted by owner')

    sessions.end(request, reply)
    return reply.status(204).send()
  })
}
