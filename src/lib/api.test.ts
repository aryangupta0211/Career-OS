import { describe, expect, it } from 'vitest'
import { apiErrorMessage, readJsonBody } from './api'

describe('readJsonBody', () => {
  it('returns undefined for an empty successful 204 response', async () => {
    await expect(readJsonBody(new Response(null, { status: 204 }))).resolves.toBeUndefined()
  })

  it('returns undefined for an empty error response', async () => {
    await expect(readJsonBody(new Response(null, { status: 503 }))).resolves.toBeUndefined()
  })

  it('rejects invalid JSON rather than throwing a native end-of-input error', async () => {
    await expect(readJsonBody(new Response('{', { headers: { 'content-type': 'application/json' } })))
      .rejects.toThrow('The server returned an invalid JSON response.')
  })

  it('reads structured API errors and uses a safe fallback for non-JSON content', async () => {
    const structured = await readJsonBody(new Response(JSON.stringify({ error: { message: 'Session expired.' } }), {
      headers: { 'content-type': 'application/json' },
    }))
    const nonJson = await readJsonBody(new Response('<html>gateway error</html>', { headers: { 'content-type': 'text/html' } }))

    expect(apiErrorMessage(structured, 'Request failed.')).toBe('Session expired.')
    expect(apiErrorMessage(nonJson, 'Request failed.')).toBe('Request failed.')
  })
})
