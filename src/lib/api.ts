export class ApiResponseError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
  }
}

/** Reads a JSON response without treating an empty or non-JSON body as JSON. */
export async function readJsonBody(response: Response): Promise<unknown | undefined> {
  if (response.status === 204 || response.status === 205) return undefined

  // A real Fetch Response always implements text(). The fallback keeps isolated
  // test doubles compatible without changing browser runtime behavior.
  if (typeof response.text !== 'function') {
    return typeof response.json === 'function' ? response.json() : undefined
  }

  const text = await response.text()
  if (!text.trim()) return undefined

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('json')) return undefined

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('The server returned an invalid JSON response.')
  }
}

export function apiErrorMessage(body: unknown, fallback: string) {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = body.error
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message
    if (typeof error === 'string') return error
  }
  return fallback
}
