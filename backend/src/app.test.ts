import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { Prisma } from '@prisma/client'
import express from 'express'
import { pinoHttp } from 'pino-http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { errorHandler } from './app.js'

describe('API error handling', () => {
  const app = express()
  let server: ReturnType<typeof app.listen>
  let baseUrl: string

  beforeAll(async () => {
    app.use(pinoHttp({ level: 'silent', autoLogging: false }))
    app.use(express.json({ limit: '1kb' }))
    app.get('/schema-mismatch', (_request, _response, next) => {
      next(new Prisma.PrismaClientKnownRequestError('Column missing', {
        code: 'P2022',
        clientVersion: '7.10.1',
      }))
    })
    app.get('/database-unavailable', (_request, _response, next) => {
      next(new Prisma.PrismaClientKnownRequestError('Connection failed', {
        code: 'P1001',
        clientVersion: '7.10.1',
      }))
    })
    app.get('/unexpected', (_request, _response, next) => {
      next(new Error('Sensitive database detail'))
    })
    app.post('/json', (_request, response) => response.json({ ok: true }))
    app.use(errorHandler)
    server = app.listen(0)
    await once(server, 'listening')
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    server.close()
    await once(server, 'close')
  })

  it('returns an actionable 503 for a missing database field without exposing internals', async () => {
    const response = await fetch(`${baseUrl}/schema-mismatch`)
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('DATABASE_SCHEMA_OUTDATED')
    expect(body.error.message).toContain('database schema needs an update')
    expect(JSON.stringify(body)).not.toContain('P2022')
    expect(JSON.stringify(body)).not.toContain('Column missing')
  })

  it('returns a safe 503 when PostgreSQL is unreachable', async () => {
    const response = await fetch(`${baseUrl}/database-unavailable`)
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('DATABASE_UNAVAILABLE')
    expect(JSON.stringify(body)).not.toContain('Connection failed')
  })

  it('returns a safe 400 for malformed JSON instead of an internal error', async () => {
    const response = await fetch(`${baseUrl}/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    })
    const body = await response.json() as { error: { code: string; message: string } }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_JSON')
    expect(JSON.stringify(body)).not.toContain('SyntaxError')
  })

  it('returns 413 when a request body exceeds the parser limit', async () => {
    const response = await fetch(`${baseUrl}/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'x'.repeat(2048) }),
    })
    const body = await response.json() as { error: { code: string } }

    expect(response.status).toBe(413)
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('does not expose internal exception messages in generic errors', async () => {
    const response = await fetch(`${baseUrl}/unexpected`)
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(body).toContain('unexpected server error')
    expect(body).not.toContain('Sensitive database detail')
  })
})
