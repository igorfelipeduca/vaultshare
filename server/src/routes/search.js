import { z } from 'zod'
import { foldText } from '../db.js'
import { toFile, toLink, toPerson } from '../lib/serializers.js'

const searchQuery = z.object({
  q: z.string().trim().max(200, 'Busca longa demais.').default(''),
})

const RESULT_LIMIT = 20

// Escapes LIKE wildcards so "%" or "_" typed by the user match literally.
const likePattern = (text) => `%${foldText(text).replace(/[\\%_]/g, (char) => `\\${char}`)}%`

export default async function searchRoutes(app, { db, config, sessions }) {
  app.addHook('preHandler', sessions.require)

  const files = db.prepare(`
    SELECT * FROM files WHERE user_id = ? AND fold(name) LIKE ? ESCAPE '\\'
    ORDER BY created_at DESC LIMIT ${RESULT_LIMIT}
  `)
  const links = db.prepare(`
    SELECT links.*, files.name AS file_name FROM links JOIN files ON files.id = links.file_id
    WHERE links.user_id = ? AND (fold(files.name) LIKE ? ESCAPE '\\' OR fold(? || '/s/' || links.slug) LIKE ? ESCAPE '\\')
    ORDER BY links.created_at DESC LIMIT ${RESULT_LIMIT}
  `)
  const people = db.prepare(`
    SELECT * FROM contacts WHERE user_id = ? AND (fold(name) LIKE ? ESCAPE '\\' OR fold(email) LIKE ? ESCAPE '\\')
    ORDER BY name LIMIT ${RESULT_LIMIT}
  `)

  app.get('/search', async (request) => {
    const { q } = searchQuery.parse(request.query)
    if (!q) return { files: [], links: [], people: [] }

    const pattern = likePattern(q)
    const userId = request.user.id
    return {
      files: files.all(userId, pattern).map(toFile),
      links: links
        .all(userId, pattern, config.publicLinkHost, pattern)
        .map((row) => toLink(row, config.publicLinkHost)),
      people: people.all(userId, pattern, pattern).map(toPerson),
    }
  })
}
