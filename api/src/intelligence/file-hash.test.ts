import { describe, it, expect, vi } from 'vitest'
import { computeSha256, checkFileDuplicate } from './file-hash.js'

describe('File Hash & Duplicate Detection', () => {
  it('computes deterministic SHA-256 hash for buffer', () => {
    const buffer1 = Buffer.from('CareerOS Resume File Content v1')
    const buffer2 = Buffer.from('CareerOS Resume File Content v1')
    const buffer3 = Buffer.from('Different Content')

    const hash1 = computeSha256(buffer1)
    const hash2 = computeSha256(buffer2)
    const hash3 = computeSha256(buffer3)

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
    expect(hash1.length).toBe(64)
  })

  it('queries database for existing active file under the authenticated user only', async () => {
    const mockPrisma = {
      vaultFile: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'file-123',
          displayName: 'Existing Resume.pdf',
          originalFilename: 'Existing Resume.pdf',
          fileSizeBytes: 1024,
          createdAt: new Date('2026-01-01'),
          category: 'RESUME',
          resumeVersions: [{ resumeGroup: { id: 'rg-1', name: 'Software Engineer' } }],
          companyDocuments: [],
          applicationDocuments: [{ application: { id: 'app-1', jobTitle: 'Full Stack Dev' } }],
        }),
      },
    } as any

    const result = await checkFileDuplicate(mockPrisma, 'user-a', 'abc123hash')

    expect(result.isDuplicate).toBe(true)
    expect(result.existingFile?.id).toBe('file-123')
    expect(result.existingFile?.displayName).toBe('Existing Resume.pdf')
    expect(result.existingFile?.resumeGroup?.name).toBe('Software Engineer')
    expect(result.existingFile?.applications?.[0]?.jobTitle).toBe('Full Stack Dev')

    // Verify isolation: query filtered strictly by userId and status: ACTIVE
    expect(mockPrisma.vaultFile.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-a',
        sha256Hash: 'abc123hash',
        status: 'ACTIVE',
      },
      include: expect.any(Object),
    })
  })

  it('returns false when no duplicate exists', async () => {
    const mockPrisma = {
      vaultFile: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any

    const result = await checkFileDuplicate(mockPrisma, 'user-a', 'nonexistenthash')
    expect(result.isDuplicate).toBe(false)
  })
})

