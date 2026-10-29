import cors from 'cors'
import { Prisma } from '@prisma/client'
import express, { type ErrorRequestHandler } from 'express'
import { pinoHttp } from 'pino-http'
import { config } from './config.js'
import { getDatabaseStatus } from './db/status.js'
import { authRouter } from './auth/provisionRoute.js'
import { dataRouter } from './data/routes.js'

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: config.WEB_ORIGIN, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], credentials: false }))
app.use(pinoHttp({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
}))
app.use(express.json({ limit: '1mb' }))
app.use('/api/auth', authRouter)
app.use('/api/data', dataRouter)

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'careeros-api',
    mode: 'authenticated-api',
    database: getDatabaseStatus(),
  })
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' })
})

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
    response.req.log.error({ prismaCode: error.code }, 'Database schema is missing a field required by this API version')
    response.status(503).json({
      error: {
        code: 'DATABASE_SCHEMA_OUTDATED',
        message: 'Workspace data is temporarily unavailable because the database schema needs an update. Review the pending migrations before trying again.',
      },
    })
    return
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError
    && ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(error.code)) {
    response.req.log.error({ prismaCode: error.code }, 'Database is temporarily unavailable')
    response.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Workspace data is temporarily unavailable. Try again shortly.',
      },
    })
    return
  }
  const parserErrorType = typeof error === 'object' && error !== null && 'type' in error
    && typeof error.type === 'string' ? error.type : ''
  if (parserErrorType === 'entity.parse.failed') {
    response.req.log.warn({ parserErrorType }, 'Request body contains invalid JSON')
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
    })
    return
  }
  if (parserErrorType === 'entity.too.large') {
    response.req.log.warn({ parserErrorType }, 'Request body exceeds the allowed size')
    response.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size.' },
    })
    return
  }
  const errorType = error instanceof Error ? error.name : 'UnknownError'
  const errorCode = typeof error === 'object' && error !== null && 'code' in error
    && typeof error.code === 'string' ? error.code : undefined
  response.req.log.error({ errorType, ...(errorCode ? { errorCode } : {}) }, 'Unhandled API request error')
  response.status(500).json({ error: 'An unexpected server error occurred.' })
}

app.use(errorHandler)
