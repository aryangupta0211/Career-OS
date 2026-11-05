import crypto from 'node:crypto'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config.js'

export interface StorageProvider {
  upload(storagePath: string, buffer: Buffer, mimeType: string): Promise<void>
  download(storagePath: string): Promise<Buffer>
  delete(storagePath: string): Promise<void>
  createSignedUrl(
    storagePath: string,
    expiresInSeconds: number,
    options?: { download?: string | boolean },
  ): Promise<string>
}

export type StorageProviderErrorCode = 'VAULT_STORAGE_UNAVAILABLE' | 'VAULT_STORAGE_AUTH_FAILED' | 'VAULT_STORAGE_BUCKET_UNAVAILABLE'

export class StorageProviderError extends Error {
  constructor(
    readonly code: StorageProviderErrorCode,
    readonly safeMessage: string,
    cause?: unknown,
  ) {
    super(safeMessage, { cause })
    this.name = 'StorageProviderError'
  }
}

function storageError(operation: string, error: unknown): StorageProviderError {
  const detail = error instanceof Error ? error.message : String(error)
  if (/bucket not found|bucket.*does not exist/i.test(detail)) {
    return new StorageProviderError('VAULT_STORAGE_BUCKET_UNAVAILABLE', 'Vault storage is unavailable because its configured bucket could not be found.', error)
  }
  if (/unauthorized|invalid api key|permission denied|row-level security|not allowed/i.test(detail)) {
    return new StorageProviderError('VAULT_STORAGE_AUTH_FAILED', 'Vault storage authentication is not authorized for this operation.', error)
  }
  return new StorageProviderError('VAULT_STORAGE_UNAVAILABLE', `Vault storage could not ${operation}. Please try again shortly.`, error)
}

export interface ValidatedFile {
  originalFilename: string
  sanitizedFilename: string
  extension: string
  mimeType: string
  fileSizeBytes: number
  sha256Hash: string
}

const SUPPORTED_EXTENSIONS: Record<string, { mimeType: string; label: string }> = {
  '.pdf': { mimeType: 'application/pdf', label: 'PDF document' },
  '.doc': { mimeType: 'application/msword', label: 'Microsoft Word document (Legacy)' },
  '.docx': { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Microsoft Word document' },
  '.txt': { mimeType: 'text/plain', label: 'Plain text document' },
  '.png': { mimeType: 'image/png', label: 'PNG image' },
  '.jpg': { mimeType: 'image/jpeg', label: 'JPEG image' },
  '.jpeg': { mimeType: 'image/jpeg', label: 'JPEG image' },
  '.webp': { mimeType: 'image/webp', label: 'WEBP image' },
}

export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename)
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_')
  return cleaned || 'document'
}

export function checkMagicBytes(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 4) return false

  switch (extension) {
    case '.pdf':
      // %PDF-
      return buffer.subarray(0, 4).toString('utf-8') === '%PDF'

    case '.png':
      // 0x89 0x50 0x4E 0x47
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4E &&
        buffer[3] === 0x47
      )

    case '.jpg':
    case '.jpeg':
      // 0xFF 0xD8 0xFF
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF

    case '.webp':
      // 'RIFF' .... 'WEBP'
      if (buffer.length < 12) return false
      return (
        buffer.subarray(0, 4).toString('utf-8') === 'RIFF' &&
        buffer.subarray(8, 12).toString('utf-8') === 'WEBP'
      )

    case '.docx':
      // Zip header PK\x03\x04
      return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04

    case '.doc':
      // OLE compound document \xD0\xCF\x11\xE0
      return buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0

    case '.txt': {
      // Must not contain null bytes in first 1024 bytes
      const checkSlice = buffer.subarray(0, Math.min(1024, buffer.length))
      for (const byte of checkSlice) {
        if (byte === 0x00) return false
      }
      return true
    }

    default:
      return false
  }
}

export function validateUploadFile(
  buffer: Buffer,
  originalFilename: string,
  _declaredMimeType?: string,
): ValidatedFile {
  if (!buffer || buffer.length === 0) {
    throw new Error('File is empty. Uploaded files must have at least 1 byte.')
  }

  if (buffer.length > config.VAULT_MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(config.VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024))
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of ${maxMb} MB.`)
  }

  const rawExt = path.extname(originalFilename || '').toLowerCase()
  if (!rawExt || !SUPPORTED_EXTENSIONS[rawExt]) {
    const allowed = Object.keys(SUPPORTED_EXTENSIONS).join(', ')
    throw new Error(`Unsupported file type: "${rawExt || 'none'}". Allowed formats: ${allowed}.`)
  }

  const matched = SUPPORTED_EXTENSIONS[rawExt]

  if (!checkMagicBytes(buffer, rawExt)) {
    throw new Error(`File content signature does not match the file extension "${rawExt}".`)
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  const sanitized = sanitizeFilename(originalFilename)

  return {
    originalFilename,
    sanitizedFilename: sanitized,
    extension: rawExt,
    mimeType: matched.mimeType,
    fileSizeBytes: buffer.length,
    sha256Hash: hash,
  }
}

export function generateStoragePath(userId: string, fileId: string, sanitizedFilename: string): string {
  return `${userId}/${fileId}/${sanitizedFilename}`
}

export class InMemoryStorageProvider implements StorageProvider {
  private files = new Map<string, { buffer: Buffer; mimeType: string }>()

  async upload(storagePath: string, buffer: Buffer, mimeType: string): Promise<void> {
    this.files.set(storagePath, { buffer, mimeType })
  }

  async download(storagePath: string): Promise<Buffer> {
    const entry = this.files.get(storagePath)
    if (!entry) throw new Error(`File not found in storage at path: ${storagePath}`)
    return entry.buffer
  }

  async delete(storagePath: string): Promise<void> {
    this.files.delete(storagePath)
  }

  async createSignedUrl(
    storagePath: string,
    expiresInSeconds: number,
    options?: { download?: string | boolean },
  ): Promise<string> {
    const entry = this.files.get(storagePath)
    if (!entry) throw new Error(`File not found in storage at path: ${storagePath}`)
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
    const dlParam = options?.download
      ? `&download=${encodeURIComponent(typeof options.download === 'string' ? options.download : 'true')}`
      : ''
    return `/api/vault/files/signed-preview?path=${encodeURIComponent(storagePath)}&exp=${exp}${dlParam}`
  }

  has(storagePath: string): boolean {
    return this.files.has(storagePath)
  }

  clear(): void {
    this.files.clear()
  }
}

export class SupabaseStorageProvider implements StorageProvider {
  private bucket: string
  private client: SupabaseClient

  constructor(bucket: string = config.VAULT_STORAGE_BUCKET) {
    this.bucket = bucket
    if (!config.SUPABASE_URL) {
      throw new Error('SUPABASE_URL is not configured.')
    }
    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      throw new StorageProviderError('VAULT_STORAGE_AUTH_FAILED', 'Vault storage requires server-side credentials.')
    }
    this.client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async upload(storagePath: string, buffer: Buffer, mimeType: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      })

    if (error) {
      throw storageError('upload the file', error)
    }
  }

  async download(storagePath: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(storagePath)

    if (error || !data) {
      throw storageError('download the file', error ?? new Error('Empty response'))
    }

    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async delete(storagePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storagePath])

    if (error) {
      throw storageError('remove the file', error)
    }
  }

  async createSignedUrl(
    storagePath: string,
    expiresInSeconds: number,
    options?: { download?: string | boolean },
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, expiresInSeconds, options)

    if (error || !data?.signedUrl) {
      throw storageError('create a secure file URL', error ?? new Error('Missing URL'))
    }

    return data.signedUrl
  }
}

let activeStorageProvider: StorageProvider | undefined

export function getStorageProvider(): StorageProvider {
  if (activeStorageProvider) return activeStorageProvider

  if (config.NODE_ENV === 'test') {
    activeStorageProvider = new InMemoryStorageProvider()
    return activeStorageProvider
  }

  activeStorageProvider = new SupabaseStorageProvider()
  return activeStorageProvider
}

export function getStorageProviderDiagnostic() {
  const provider = getStorageProvider()
  return {
    provider: provider instanceof SupabaseStorageProvider ? 'supabase' : 'in-memory',
    bucket: config.VAULT_STORAGE_BUCKET,
  }
}

export function setStorageProvider(provider: StorageProvider | undefined) {
  activeStorageProvider = provider
}
