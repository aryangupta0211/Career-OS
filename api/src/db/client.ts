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

  const certPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../prod-ca-2021.crt')
  const ca = fs.existsSync(certPath) ? fs.readFileSync(certPath, 'utf8') : undefined

  const parsed = new URL(config.DATABASE_URL)
  const isSupabase = parsed.hostname.includes('supabase.co') || parsed.hostname.includes('supabase.com')

  if (ca && isSupabase) {
    pool = new pg.Pool({
      host: parsed.hostname,
      port: Number(parsed.port) || 5432,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, '') || 'postgres',
      ssl: {
        rejectUnauthorized: true,
        ca,
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
