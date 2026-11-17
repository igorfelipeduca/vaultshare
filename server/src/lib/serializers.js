// Turns database rows into the exact shapes documented in BACKEND.md. Hashes and storage details never leave here.

export const toUser = (row) => ({ id: row.id, name: row.name, email: row.email, plan: row.plan })

export const toSettings = (row) => ({
  requirePassword: Boolean(row.require_password),
  notifyAccess: Boolean(row.notify_access),
  allowAccessRequests: Boolean(row.allow_access_requests),
})

export const toFile = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  sizeBytes: row.size_bytes,
  createdAt: row.created_at,
})

export const toLink = (row, publicLinkHost) => ({
  id: row.id,
  fileId: row.file_id,
  fileName: row.file_name,
  url: `${publicLinkHost}/s/${row.slug}`,
  expiresAt: row.expires_at,
  hasPassword: row.password_hash !== null,
  readOnly: Boolean(row.read_only),
  accessCount: row.access_count,
  createdAt: row.created_at,
})

export const toEvent = (row) => ({
  id: row.id,
  type: row.type,
  actor: row.actor,
  fileName: row.file_name,
  createdAt: row.created_at,
})

export const toPerson = (row) => ({ id: row.id, name: row.name, email: row.email })
