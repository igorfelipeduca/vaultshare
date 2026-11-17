import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto'
import { hash, verify } from '@node-rs/argon2'

export const newId = () => randomUUID()

// 32 bytes = 256 bits of entropy, safe to put in a cookie.
export const newSessionToken = () => randomBytes(32).toString('base64url')

// 16 bytes = 128 bits: unguessable even for a link without password.
export const newLinkSlug = () => randomBytes(16).toString('base64url')

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

// argon2id with the library defaults (OWASP minimum: m=19 MiB, t=2, p=1).
export const hashPassword = (password) => hash(password)

export async function verifyPassword(passwordHash, password) {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

// AES-256-GCM: a random 12-byte IV per file, and the auth tag detects tampering on read.
export function createEncryptor(key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  return { cipher, iv: iv.toString('base64'), authTag: () => cipher.getAuthTag().toString('base64') }
}

export function createDecryptor(key, iv, authTag) {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(authTag, 'base64'))
  return decipher
}
