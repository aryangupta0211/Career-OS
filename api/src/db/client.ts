import fs from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'
import { config } from '../config.js'

let prisma: PrismaClient | undefined
let pool: pg.Pool | undefined

export function getPrismaClient() {
  if (!config.DATABASE_URL) throw new Error('DATABASE_URL must be configured before database access.')
  if (prisma) return prisma

  const parsed = new URL(config.DATABASE_URL)
  const isSupabase = ['.supabase.co', '.supabase.com'].some((suffix) => parsed.hostname.endsWith(suffix))

  if (isSupabase) {
    const moduleDirectory = dirname(fileURLToPath(import.meta.url))
    const certPaths = [
      resolve(moduleDirectory, '../prod-ca-2021.crt'),
      resolve(moduleDirectory, '../../prod-ca-2021.crt'),
    ]
    const certPath = certPaths.find(fs.existsSync)
    if (!certPath) {
      throw new Error('The Supabase PostgreSQL CA certificate is missing; refusing an unverified TLS connection.')
    }

    pool = new pg.Pool({
      host: parsed.hostname,
      port: Number(parsed.port) || 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '') || 'postgres',
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(certPath, 'utf8'),
        servername: parsed.hostname,
      },
    })
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    })
  } else {
    pool = new pg.Pool({
      connectionString: config.DATABASE_URL,
    })
    prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    })
  }

  return prisma
}

export async function disconnectPrismaClient() {
  if (!prisma) return
  const currentPrisma = prisma
  const currentPool = pool
  prisma = undefined
  pool = undefined
  await currentPrisma.$disconnect()
  if (currentPool) {
    await currentPool.end()
  }
}
