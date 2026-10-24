import { app } from './app.js'
import { config } from './config.js'
import { disconnectPrismaClient, getPrismaClient } from './db/client.js'
import { setDatabaseStatus } from './db/status.js'

async function startServer() {
  if (config.DATABASE_URL) {
    setDatabaseStatus('configured')
    try {
      await getPrismaClient().$queryRaw`SELECT 1`
      setDatabaseStatus('connected')
    } catch (error: unknown) {
      const code = error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : 'unknown'
      setDatabaseStatus('unavailable')
      console.error(`CareerOS PostgreSQL connection is unavailable (${code}); the demo frontend and health endpoint remain usable.`)
      await disconnectPrismaClient()
    }
  }

  const server = app.listen(config.PORT, () => {
    console.info(`CareerOS API listening on http://localhost:${config.PORT}`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('CareerOS API failed to start.', error.code ?? 'unknown server error')
    process.exitCode = 1
  })

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error('CareerOS API failed to close cleanly.')
        process.exitCode = 1
      }
      void disconnectPrismaClient().catch(() => {
        console.error('CareerOS could not close the PostgreSQL connection cleanly.')
        process.exitCode = 1
      })
    })
    console.info('CareerOS API is shutting down.')
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

startServer().catch(() => {
  console.error('CareerOS API could not start. Verify its configuration without sharing secrets.')
  process.exitCode = 1
})
