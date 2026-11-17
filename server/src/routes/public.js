import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { pipeline } from 'node:stream'
import { z } from 'zod'
import { createDecryptor, verifyPassword } from '../lib/crypto.js'
import { transaction } from '../db.js'
import { badRequest, notFound } from '../lib/errors.js'
import { logEvent } from '../lib/events.js'

const slugParams = z.object({ slug: z.string().regex(/^[\w-]{22}$/) })

const downloadBody = z.object({
  password: z.string().max(1024).nullable().optional(),
})

// Only types a browser can show safely. Anything else is sent as a plain download, so an uploaded HTML or SVG file
// can never run as a page on this origin.
const INLINE_TYPES = {
  PDF: 'application/pdf',
  PNG: 'image/png',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  GIF: 'image/gif',
}

// Shown in the owner's activity feed as "<actor> acessou <file>". Visitors are not identified.
export const LINK_VISITOR = 'Alguém com o link'

const NOT_AVAILABLE = 'Este link não existe ou expirou.'

// Routes for whoever holds a share link. No session: the 128-bit slug is the credential, plus the password if set.
export default async function publicRoutes(app, { db, config }) {
  const findLink = db.prepare(`
    SELECT links.*, files.name AS file_name, files.type AS file_type, files.size_bytes,
           files.storage_key, files.iv, files.auth_tag
    FROM links JOIN files ON files.id = links.file_id
    WHERE links.slug = ? AND (links.expires_at IS NULL OR links.expires_at > ?)
  `)
  const countAccess = db.prepare('UPDATE links SET access_count = access_count + 1 WHERE id = ?')

  // A malformed slug answers 404 like a missing or expired one.
  const getLink = (params) => {
    const parsed = slugParams.safeParse(params)
    const link = parsed.success ? findLink.get(parsed.data.slug, new Date().toISOString()) : undefined
    if (!link) throw notFound(NOT_AVAILABLE)
    return link
  }

  app.get('/public/links/:slug', async (request) => {
    const link = getLink(request.params)
    return {
      fileName: link.file_name,
      fileType: link.file_type,
      sizeBytes: link.size_bytes,
      expiresAt: link.expires_at,
      hasPassword: link.password_hash !== null,
      readOnly: Boolean(link.read_only),
      hasContent: link.storage_key !== null,
    }
  })

  app.post(
    '/public/links/:slug/download',
    {
      config: {
        // Keyed on the link: slows down password guessing however many addresses the guesses come from.
        rateLimit: { max: 10, timeWindow: '1 minute', keyGenerator: (request) => `link:${request.params.slug}` },
      },
    },
    async (request, reply) => {
      const link = getLink(request.params)
      const { password } = downloadBody.parse(request.body ?? {})

      if (link.password_hash !== null) {
        if (!password) throw badRequest('Este link exige senha.', { password: 'Informe a senha' })
        if (!(await verifyPassword(link.password_hash, password))) {
          throw badRequest('Senha incorreta.', { password: 'Senha incorreta' })
        }
      }
      if (link.storage_key === null) throw notFound('Este arquivo ainda não tem conteúdo para baixar.')

      transaction(db, () => {
        countAccess.run(link.id)
        logEvent(db, { userId: link.user_id, type: 'file_accessed', actor: LINK_VISITOR, fileName: link.file_name })
      })

      const inlineType = INLINE_TYPES[link.file_type]
      const disposition = link.read_only && inlineType ? 'inline' : 'attachment'
      // pipeline() forwards a read error to the decipher stream, so Fastify aborts the response instead of hanging.
      const decrypted = pipeline(
        createReadStream(join(config.storageDir, link.storage_key)),
        createDecryptor(config.encryptionKey, link.iv, link.auth_tag),
        () => {},
      )
      return reply
        .header('Content-Type', inlineType ?? 'application/octet-stream')
        .header('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(link.file_name)}`)
        .header('Cache-Control', 'no-store')
        .send(decrypted)
    },
  )
}
