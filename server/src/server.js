import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { openDatabase } from './db.js'

const config = loadConfig()
const db = openDatabase(config.databasePath)
const app = await buildApp({ config, db })

const shutdown = async (signal) => {
  app.log.info({ signal }, 'shutting down')
  await app.close()
  db.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
