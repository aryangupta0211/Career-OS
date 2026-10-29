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
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
}).superRefine((values, context) => {
  if (Boolean(values.SUPABASE_URL) !== Boolean(values.SUPABASE_PUBLISHABLE_KEY)) {
    context.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured together.' })
  }
})

const result = environmentSchema.safeParse(process.env)
if (!result.success) {
  throw new Error(`Invalid API environment configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
}

export const config = result.data
