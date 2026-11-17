import { newId } from './crypto.js'

export function logEvent(db, { userId, type, actor = null, fileName = null }) {
  db.prepare('INSERT INTO events (id, user_id, type, actor, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    newId(),
    userId,
    type,
    actor,
    fileName,
    new Date().toISOString(),
  )
}
