import crypto from 'node:crypto'

export function cuid2(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(12).toString('hex').slice(0, 16)
  return `c${timestamp}${random}`
}
