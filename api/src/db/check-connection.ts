import { disconnectPrismaClient, getPrismaClient } from './client.js'

async function checkConnection() {
  const prisma = getPrismaClient()
  try {
    await prisma.$connect()
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
      ORDER BY table_name
    `
    console.info('PostgreSQL connection succeeded.')
    console.info(tables.length
      ? `Existing public tables: ${tables.map(({ table_name }) => table_name).join(', ')}`
      : 'No non-Prisma tables found in the public schema.')
  } finally {
    await disconnectPrismaClient()
  }
}

checkConnection().catch((error: unknown) => {
  const code = error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code : 'unknown'
  const databaseCode = error instanceof Error && 'meta' in error && error.meta && typeof error.meta === 'object' && 'code' in error.meta && typeof error.meta.code === 'string'
    ? error.meta.code
    : undefined
  console.error(`PostgreSQL connection check failed (${code}${databaseCode ? `/${databaseCode}` : ''}). Verify api/.env without sharing its secret.`)
  process.exitCode = 1
})
