import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_PATH: z.string().default('data/vaultshare.db'),
  STORAGE_DIR: z.string().default('storage'),
  // 32 bytes em base64. Gere com: node -e "console.log(crypto.randomBytes(32).toString('base64'))"
  ENCRYPTION_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  PUBLIC_LINK_HOST: z.string().default('vaultshare.app'),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100 * 1024 * 1024),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  LOG_LEVEL: z.string().default('info'),
})

// An origin with "*" (e.g. https://vaultshare-*-team.vercel.app) becomes a RegExp where "*" matches
// a single DNS label fragment: letters, digits and hyphens, never "." or "/".
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const toOriginMatcher = (origin) =>
  origin.includes('*') ? new RegExp(`^${origin.split('*').map(escapeRegExp).join('[a-z0-9-]+')}$`) : origin

export function loadConfig(env = process.env) {
  const parsed = schema.parse(env)
  const isProduction = parsed.NODE_ENV === 'production'

  let encryptionKey
  if (parsed.ENCRYPTION_KEY) {
    encryptionKey = Buffer.from(parsed.ENCRYPTION_KEY, 'base64')
    if (encryptionKey.length !== 32) throw new Error('ENCRYPTION_KEY precisa ter 32 bytes em base64.')
  } else if (isProduction) {
    throw new Error('ENCRYPTION_KEY é obrigatória em produção.')
  } else {
    // Fixed development key so encrypted files survive restarts. Never used in production.
    encryptionKey = Buffer.alloc(32, 7)
  }

  return {
    env: parsed.NODE_ENV,
    isProduction,
    host: parsed.HOST,
    port: parsed.PORT,
    databasePath: parsed.DATABASE_PATH,
    storageDir: parsed.STORAGE_DIR,
    encryptionKey,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map(toOriginMatcher),
    publicLinkHost: parsed.PUBLIC_LINK_HOST,
    maxUploadBytes: parsed.MAX_UPLOAD_BYTES,
    sessionTtlMs: parsed.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    logLevel: parsed.LOG_LEVEL,
  }
}
