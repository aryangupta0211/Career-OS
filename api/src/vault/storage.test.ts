import { describe, expect, it } from 'vitest'
import {
  checkMagicBytes,
  generateStoragePath,
  InMemoryStorageProvider,
  sanitizeFilename,
  validateUploadFile,
} from './storage.js'

describe('Vault storage validation and providers', () => {
  it('correctly sanitizes dangerous or special characters in filenames', () => {
    expect(sanitizeFilename('my resume (final) [2026]!@#.pdf')).toBe('my_resume__final___2026____.pdf')
    expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('normal-file_name.1.pdf')).toBe('normal-file_name.1.pdf')
  })

  it('verifies magic bytes for valid documents and images', () => {
    const pdfHeader = Buffer.from('%PDF-1.4\n...')
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const jpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
    const docxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
    const docHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    const txtContent = Buffer.from('Senior Software Engineer with 8 years of experience in React and Node.')

    expect(checkMagicBytes(pdfHeader, '.pdf')).toBe(true)
    expect(checkMagicBytes(pngHeader, '.png')).toBe(true)
    expect(checkMagicBytes(jpgHeader, '.jpg')).toBe(true)
    expect(checkMagicBytes(docxHeader, '.docx')).toBe(true)
    expect(checkMagicBytes(docHeader, '.doc')).toBe(true)
    expect(checkMagicBytes(txtContent, '.txt')).toBe(true)
  })

  it('rejects forged file signatures (e.g. text file renamed to .pdf)', () => {
    const fakePdf = Buffer.from('This is not actually a real PDF file')
    expect(checkMagicBytes(fakePdf, '.pdf')).toBe(false)

    expect(() => {
      validateUploadFile(fakePdf, 'fake_resume.pdf')
    }).toThrow(/signature does not match/)
  })

  it('rejects unsupported extensions', () => {
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00')
    expect(() => {
      validateUploadFile(exeBuffer, 'malware.exe')
    }).toThrow(/Unsupported file type/)
  })

  it('generates consistent, server-controlled logical storage paths', () => {
    const path = generateStoragePath('usr_123', 'file_abc', 'clean_resume.pdf')
    expect(path).toBe('usr_123/file_abc/clean_resume.pdf')
  })

  it('supports in-memory storage provider upload, download, delete and signed URL', async () => {
    const provider = new InMemoryStorageProvider()
    const path = 'user1/file1/test.pdf'
    const content = Buffer.from('%PDF-1.4\nTest Document Content')

    await provider.upload(path, content, 'application/pdf')
    expect(provider.has(path)).toBe(true)

    const downloaded = await provider.download(path)
    expect(downloaded.toString()).toBe(content.toString())

    const signedUrl = await provider.createSignedUrl(path, 300)
    expect(signedUrl).toContain(encodeURIComponent(path))

    await provider.delete(path)
    expect(provider.has(path)).toBe(false)
  })
})

