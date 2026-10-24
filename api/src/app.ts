import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { pinoHttp } from 'pino-http'
import { config } from './config.js'
import { getDatabaseStatus } from './db/status.js'

export const app = express()

app.disable('x-powered-by')
app.use(cors({ origin: config.WEB_ORIGIN, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], credentials: false }))
app.use(pinoHttp({ level: config.NODE_ENV === 'production' ? 'info' : 'debug' }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'careeros-api',
    mode: 'foundation-only',
    database: getDatabaseStatus(),
  })
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' })
})

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  response.req.log.error({ err: error }, 'Unhandled API request error')
  response.status(500).json({ error: 'An unexpected server error occurred.' })
}

app.use(errorHandler)
