// Creates a demo account with the same sample data the front-end mock used.
// Usage: npm run seed            (keeps an existing account)
//        npm run seed -- --reset (deletes the demo account first)
import { randomBytes } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { loadConfig } from './config.js'
import { openDatabase, transaction } from './db.js'
import { hashPassword, newId, newLinkSlug } from './lib/crypto.js'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const EMAIL = 'marina@empresa.com'

const config = loadConfig()
if (config.isProduction) {
  console.error('O seed não roda em produção.')
  process.exit(1)
}

const db = openDatabase(config.databasePath)
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL)

if (existing && !process.argv.includes('--reset')) {
  console.log(`Conta ${EMAIL} já existe. Use "npm run seed -- --reset" para recriar.`)
  process.exit(0)
}

const password = process.env.SEED_PASSWORD || randomBytes(12).toString('base64url')
const passwordHash = await hashPassword(password)
const now = Date.now()
const ago = (ms) => new Date(now - ms).toISOString()
const fromNow = (ms) => new Date(now + ms).toISOString()

// Encrypted blobs are not covered by ON DELETE CASCADE: remove them too, like DELETE /me does.
const orphanKeys = existing
  ? db
      .prepare('SELECT storage_key FROM files WHERE user_id = ? AND storage_key IS NOT NULL')
      .all(existing.id)
      .map((row) => row.storage_key)
  : []

transaction(db, () => {
  if (existing) db.prepare('DELETE FROM users WHERE id = ?').run(existing.id)

  const userId = newId()
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, plan, require_password, notify_access, allow_access_requests, created_at)
    VALUES (?, 'Marina Costa', ?, ?, 'Pro Secure', 1, 1, 0, ?)
  `).run(userId, EMAIL, passwordHash, ago(30 * DAY))

  const insertFile = db.prepare(
    'INSERT INTO files (id, user_id, name, type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const files = {}
  for (const [key, name, type, size, age] of [
    ['planning', 'Planejamento_2026.pdf', 'PDF', 2_400_000, 12 * MINUTE],
    ['deck', 'Apresentação produto.png', 'PNG', 1_100_000, 2 * HOUR],
    ['contract', 'Contrato_fornecedores.pdf', 'PDF', 840_000, 26 * HOUR],
    ['notes', 'Notas da reunião.docx', 'DOCX', 126_000, 3 * DAY],
    ['backup', 'Backup_fotos.zip', 'ZIP', 48_000_000, 8 * DAY],
  ]) {
    files[key] = newId()
    insertFile.run(files[key], userId, name, type, size, ago(age))
  }

  const insertLink = db.prepare(`
    INSERT INTO links (id, user_id, file_id, slug, password_hash, expires_at, read_only, access_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertLink.run(newId(), userId, files.deck, newLinkSlug(), passwordHash, fromNow(7 * DAY), 0, 0, ago(2 * HOUR))
  insertLink.run(newId(), userId, files.planning, newLinkSlug(), null, null, 1, 3, ago(3 * DAY))

  const insertEvent = db.prepare(
    'INSERT INTO events (id, user_id, type, actor, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  insertEvent.run(newId(), userId, 'file_accessed', 'financeiro@empresa.com', 'Planejamento_2026.pdf', ago(12 * MINUTE))
  insertEvent.run(newId(), userId, 'link_created', null, 'Apresentação produto.png', ago(2 * HOUR))
  insertEvent.run(newId(), userId, 'password_added', null, 'Contrato_fornecedores.pdf', ago(26 * HOUR))
  insertEvent.run(newId(), userId, 'access_requested', 'Lucas Almeida', null, ago(27 * HOUR))

  const insertContact = db.prepare('INSERT INTO contacts (id, user_id, name, email) VALUES (?, ?, ?, ?)')
  insertContact.run(newId(), userId, 'Lucas Almeida', 'lucas@empresa.com')
  insertContact.run(newId(), userId, 'Financeiro', 'financeiro@empresa.com')
})

for (const key of orphanKeys) rmSync(join(config.storageDir, key), { force: true })

console.log(`Conta de demonstração criada.\n  e-mail: ${EMAIL}`)
if (!process.env.SEED_PASSWORD) console.log(`  senha:  ${password}`)
db.close()
