import { createWriteStream } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { z } from 'zod'
import { createEncryptor, newId } from '../lib/crypto.js'
import { transaction } from '../db.js'
import { badRequest, payloadTooLarge, quotaExceeded } from '../lib/errors.js'
import { logEvent } from '../lib/events.js'
import { toFile } from '../lib/serializers.js'

export const CREATABLE_TYPES = ['PDF', 'PNG', 'DOCX', 'ZIP']

// Magic numbers for the extensions we can recognise. The client-declared MIME type is never trusted.
const SIGNATURES = {
  PDF: [[0x25, 0x50, 0x44, 0x46, 0x2d]],
  PNG: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  JPG: [[0xff, 0xd8, 0xff]],
  JPEG: [[0xff, 0xd8, 0xff]],
  GIF: [[0x47, 0x49, 0x46, 0x38]],
  ZIP: [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
  ],
  DOCX: [[0x50, 0x4b, 0x03, 0x04]],
  XLSX: [[0x50, 0x4b, 0x03, 0x04]],
  PPTX: [[0x50, 0x4b, 0x03, 0x04]],
}

const createBody = z.object({
  name: z
    .string({ error: 'Informe o nome do arquivo.' })
    .trim()
    .min(1, 'Informe o nome do arquivo.')
    .max(200, 'Use no máximo 200 caracteres.'),
  type: z.enum(CREATABLE_TYPES, { error: 'Escolha um tipo válido.' }),
})

// Display name only: strips any path and control characters. It is never used to build a path on disk.
export function sanitizeFileName(raw) {
  const withoutControl = [...basename(String(raw).replaceAll('\\', '/'))]
    .filter((char) => char.charCodeAt(0) > 0x1f && char.charCodeAt(0) !== 0x7f)
    .join('')
  const name = withoutControl.trim().slice(0, 200)
  return name || 'arquivo'
}

export const typeFromName = (name) => name.match(/\.([a-z0-9]{1,10})$/i)?.[1].toUpperCase() ?? 'ARQUIVO'

const matchesSignature = (type, header) =>
  !SIGNATURES[type] || SIGNATURES[type].some((signature) => signature.every((byte, index) => header[index] === byte))

export default async function fileRoutes(app, { db, config, sessions }) {
  app.addHook('preHandler', sessions.require)

  const list = db.prepare('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC')
  const used = db.prepare('SELECT COALESCE(SUM(size_bytes), 0) AS used FROM files WHERE user_id = ?')
  const insert = db.prepare(`
    INSERT INTO files (id, user_id, name, type, size_bytes, storage_key, iv, auth_tag, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
  `)

  app.get('/files', async (request) => list.all(request.user.id).map(toFile))

  app.post('/files', async (request, reply) => {
    const input = createBody.parse(request.body)
    const extension = `.${input.type.toLowerCase()}`
    const base = sanitizeFileName(input.name)
    const name = base.toLowerCase().endsWith(extension) ? base : base + extension

    const row = transaction(db, () => {
      const file = insert.get(newId(), request.user.id, name, input.type, 0, null, null, null, new Date().toISOString())
      logEvent(db, { userId: request.user.id, type: 'file_created', fileName: file.name })
      return file
    })
    return reply.status(201).send(toFile(row))
  })

  app.post('/files/upload', async (request, reply) => {
    const user = request.user
    if (used.get(user.id).used >= user.storage_quota_bytes) throw quotaExceeded()

    const part = await request.file({ limits: { fileSize: config.maxUploadBytes, files: 1 } })
    if (part?.fieldname !== 'file') throw badRequest('Envie o arquivo no campo "file".')

    const name = sanitizeFileName(part.filename)
    const type = typeFromName(name)
    const storageKey = `${newId()}.bin`
    const path = join(config.storageDir, storageKey)
    const encryptor = createEncryptor(config.encryptionKey)

    let size = 0
    let header = Buffer.alloc(0)
    const inspect = new Transform({
      transform(chunk, _encoding, callback) {
        size += chunk.length
        if (header.length < 16) header = Buffer.concat([header, chunk]).subarray(0, 16)
        callback(null, chunk)
      },
    })

    await mkdir(config.storageDir, { recursive: true })
    try {
      await pipeline(part.file, inspect, encryptor.cipher, createWriteStream(path, { mode: 0o600 }))
      if (part.file.truncated) throw payloadTooLarge('O arquivo passa do tamanho máximo permitido.')
      if (size > 0 && !matchesSignature(type, header)) {
        throw badRequest('O conteúdo do arquivo não corresponde à extensão.', { file: 'Tipo de arquivo inválido' })
      }

      const row = transaction(db, () => {
        // Re-checked inside the transaction so two parallel uploads cannot both pass the quota.
        if (used.get(user.id).used + size > user.storage_quota_bytes) throw quotaExceeded()
        const file = insert.get(
          newId(),
          user.id,
          name,
          type,
          size,
          storageKey,
          encryptor.iv,
          encryptor.authTag(),
          new Date().toISOString(),
        )
        logEvent(db, { userId: user.id, type: 'file_uploaded', fileName: file.name })
        return file
      })
      return reply.status(201).send(toFile(row))
    } catch (error) {
      await rm(path, { force: true })
      throw error
    }
  })
}
