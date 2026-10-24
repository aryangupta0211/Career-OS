import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') })

function isPostgreSQLUrl(value: string) {
  try {
    return ['postgres:', 'postgresql:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().refine(isPostgreSQLUrl, 'DATABASE_URL must use PostgreSQL').optional(),
})

const result = environmentSchema.safeParse(process.env)
if (!result.success) {
  throw new Error(`Invalid API environment configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
}

export const config = result.data
