import { getDataMode } from './supabase'
import { apiErrorMessage, readJsonBody } from './api'
import { demoVaultStore } from './vaultDemo'
import type {
  CompanyResource,
  JobDescription,
  ResumeGroup,
  ResumeVersion,
  StorageSummary,
  VaultFile,
} from '../types'

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const vaultApi = {
  async getFiles(params: {
    category?: string
    status?: string
    search?: string
    extension?: string
    page?: number
    limit?: number
    sortBy?: string
    token?: string
  }): Promise<{ files: VaultFile[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    if (getDataMode() === 'demo') {
      const files = demoVaultStore.getFiles({
        category: params.category,
        status: params.status,
        search: params.search,
      })
      return {
        files,
        pagination: { page: 1, limit: 50, total: files.length, totalPages: 1 },
      }
    }

    const query = new URLSearchParams()
    if (params.category) query.set('category', params.category)
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.extension) query.set('extension', params.extension)
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.sortBy) query.set('sortBy', params.sortBy)

    const response = await fetch(`/api/vault/files?${query.toString()}`, {
      headers: authHeader(params.token),
    })
    if (!response.ok) throw new Error(`Failed to fetch files: ${response.statusText}`)
    return response.json()
  },

  async getFile(id: string, token?: string): Promise<VaultFile> {
    if (getDataMode() === 'demo') {
      const file = demoVaultStore.getFile(id)
      if (!file) throw new Error('File not found')
      return file
    }

    const response = await fetch(`/api/vault/files/${id}`, {
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
    return response.json()
  },

  async uploadFile(
    file: File,
    metadata: {
      displayName?: string
      category?: string
      description?: string
      tags?: string[]
      companyId?: string
      applicationId?: string
      documentRole?: string
      token?: string
    },
  ): Promise<VaultFile> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.uploadFile(file, {
        displayName: metadata.displayName,
        category: metadata.category as any,
        description: metadata.description,
        tags: metadata.tags,
      })
    }

    const formData = new FormData()
    if (metadata.category) formData.append('category', metadata.category)
    if (metadata.displayName) formData.append('displayName', metadata.displayName)
    if (metadata.description) formData.append('description', metadata.description)
    if (metadata.tags && metadata.tags.length > 0) formData.append('tags', metadata.tags.join(', '))
    if (metadata.companyId) formData.append('companyId', metadata.companyId)
    if (metadata.applicationId) formData.append('applicationId', metadata.applicationId)
    if (metadata.documentRole) formData.append('documentRole', metadata.documentRole)
    formData.append('file', file)

    const response = await fetch('/api/vault/files/upload', {
      method: 'POST',
      headers: authHeader(metadata.token),
      body: formData,
    })
    if (!response.ok) {
      const body = await readJsonBody(response).catch(() => undefined)
      throw new Error(apiErrorMessage(body, `Upload failed with status ${response.status}`))
    }
    return await readJsonBody(response) as VaultFile
  },

  async updateFile(
    id: string,
    patch: {
      displayName?: string
      description?: string | null
      category?: string
      tags?: string[]
      companyId?: string | null
      applicationId?: string | null
    },
    token?: string,
  ): Promise<VaultFile> {
    if (getDataMode() === 'demo') {
      const updated = demoVaultStore.updateFile(id, patch as any)
      if (!updated) throw new Error('File not found')
      return updated
    }

    const response = await fetch(`/api/vault/files/${id}`, {
      method: 'PATCH',
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    })
    if (!response.ok) throw new Error('Failed to update file')
    return response.json()
  },

  async deleteFile(id: string, permanent: boolean = false, force: boolean = false, token?: string): Promise<void> {
    if (getDataMode() === 'demo') {
      demoVaultStore.deleteFile(id, permanent)
      return
    }

    const query = new URLSearchParams()
    if (permanent) query.set('permanent', 'true')
    if (force) query.set('force', 'true')

    const response = await fetch(`/api/vault/files/${id}?${query.toString()}`, {
      method: 'DELETE',
      headers: authHeader(token),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to delete file')
    }
  },

  async restoreFile(id: string, token?: string): Promise<VaultFile> {
    if (getDataMode() === 'demo') {
      const restored = demoVaultStore.restoreFile(id)
      if (!restored) throw new Error('File not found')
      return restored
    }

    const response = await fetch(`/api/vault/files/${id}/restore`, {
      method: 'POST',
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to restore file')
    const body = await response.json()
    return body.file
  },

  async getPreviewUrl(id: string, token?: string): Promise<string> {
    if (getDataMode() === 'demo') {
      return `/api/vault/files/${id}/content`
    }
    const response = await fetch(`/api/vault/files/${id}/preview-url`, {
      headers: authHeader(token),
    })
    if (!response.ok) return `/api/vault/files/${id}/content${token ? `?token=${encodeURIComponent(token)}` : ''}`
    const body = await response.json()
    return body.previewUrl || `/api/vault/files/${id}/content${token ? `?token=${encodeURIComponent(token)}` : ''}`
  },

  async getDownloadUrl(id: string, token?: string): Promise<string> {
    if (getDataMode() === 'demo') {
      return `/api/vault/files/${id}/content?download=true`
    }
    try {
      const response = await fetch(`/api/vault/files/${id}/download-url`, {
        headers: authHeader(token),
      })
      if (response.ok) {
        const body = await response.json()
        if (body.downloadUrl) return body.downloadUrl
      }
    } catch {
      // Fallback
    }
    return `/api/vault/files/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`
  },

  async downloadFile(id: string, fallbackFilename?: string, token?: string): Promise<void> {
    const downloadUrl = await this.getDownloadUrl(id, token)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    if (fallbackFilename) {
      anchor.download = fallbackFilename
    }
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  },

  async getResumeGroups(includeArchived: boolean = false, token?: string): Promise<ResumeGroup[]> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.getResumeGroups(includeArchived)
    }

    const response = await fetch(`/api/vault/resumes?includeArchived=${includeArchived}`, {
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to fetch resume groups')
    return response.json()
  },

  async createResumeGroup(
    data: { name: string; targetRole?: string; description?: string; skills?: string[] },
    token?: string,
  ): Promise<ResumeGroup> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.createResumeGroup(data)
    }

    const response = await fetch('/api/vault/resumes', {
      method: 'POST',
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to create resume group')
    }
    return response.json()
  },

  async uploadResumeVersion(
    groupId: string,
    file: File,
    metadata: { versionLabel?: string; description?: string; skills?: string[]; isCurrent?: boolean },
    token?: string,
  ): Promise<ResumeVersion> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.uploadResumeVersion(groupId, file, metadata)
    }

    const formData = new FormData()
    formData.append('file', file)
    if (metadata.versionLabel) formData.append('versionLabel', metadata.versionLabel)
    if (metadata.description) formData.append('description', metadata.description)
    if (metadata.skills) formData.append('skills', metadata.skills.join(', '))
    if (metadata.isCurrent !== undefined) formData.append('isCurrent', String(metadata.isCurrent))

    const response = await fetch(`/api/vault/resumes/${groupId}/versions`, {
      method: 'POST',
      headers: authHeader(token),
      body: formData,
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to upload resume version')
    }
    return response.json()
  },

  async setCurrentResumeVersion(groupId: string, versionId: string, token?: string): Promise<void> {
    if (getDataMode() === 'demo') {
      demoVaultStore.setCurrentResumeVersion(groupId, versionId)
      return
    }

    const response = await fetch(`/api/vault/resumes/${groupId}/versions/${versionId}/current`, {
      method: 'PATCH',
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to update current version')
  },

  async getJobDescriptions(token?: string): Promise<JobDescription[]> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.getJobDescriptions()
    }

    const response = await fetch('/api/vault/job-descriptions', {
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to fetch job descriptions')
    return response.json()
  },

  async createJobDescription(
    data: Partial<JobDescription>,
    file?: File,
    token?: string,
  ): Promise<JobDescription> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.createJobDescription(data, file)
    }

    const formData = new FormData()
    if (file) formData.append('file', file)
    if (data.title) formData.append('title', data.title)
    if (data.companyId) formData.append('companyId', data.companyId)
    if (data.location) formData.append('location', data.location)
    if (data.experienceLevel) formData.append('experienceLevel', data.experienceLevel)
    if (data.employmentType) formData.append('employmentType', data.employmentType)
    if (data.sourceUrl) formData.append('sourceUrl', data.sourceUrl)
    if (data.careerPageUrl) formData.append('careerPageUrl', data.careerPageUrl)
    if (data.applicationDeadline) formData.append('applicationDeadline', data.applicationDeadline)
    if (data.responsibilities) formData.append('responsibilities', data.responsibilities)
    if (data.requiredSkills) formData.append('requiredSkills', data.requiredSkills.join(', '))
    if (data.preferredSkills) formData.append('preferredSkills', data.preferredSkills.join(', '))
    if (data.descriptionText) formData.append('descriptionText', data.descriptionText)
    if (data.notes) formData.append('notes', data.notes)

    const response = await fetch('/api/vault/job-descriptions', {
      method: 'POST',
      headers: authHeader(token),
      body: formData,
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to create job description')
    }
    return response.json()
  },

  async deleteJobDescription(id: string, token?: string): Promise<void> {
    if (getDataMode() === 'demo') {
      demoVaultStore.deleteJobDescription(id)
      return
    }

    const response = await fetch(`/api/vault/job-descriptions/${id}`, {
      method: 'DELETE',
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to delete job description')
  },

  async getCompanyResources(
    companyId: string,
    token?: string,
  ): Promise<{ links: CompanyResource[]; documents: any[]; jobDescriptions: JobDescription[] }> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.getCompanyResources(companyId)
    }

    const response = await fetch(`/api/vault/companies/${companyId}/resources`, {
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to fetch company resources')
    return response.json()
  },

  async createCompanyResource(
    companyId: string,
    resource: Partial<CompanyResource>,
    token?: string,
  ): Promise<CompanyResource> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.createCompanyResource(companyId, resource)
    }

    const response = await fetch(`/api/vault/companies/${companyId}/resources`, {
      method: 'POST',
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to create company resource')
    }
    return response.json()
  },

  async deleteCompanyResource(companyId: string, resourceId: string, token?: string): Promise<void> {
    if (getDataMode() === 'demo') {
      demoVaultStore.deleteCompanyResource(companyId, resourceId)
      return
    }

    const response = await fetch(`/api/vault/companies/${companyId}/resources/${resourceId}`, {
      method: 'DELETE',
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to delete company resource')
  },

  async getStorageSummary(token?: string): Promise<StorageSummary> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.getStorageSummary()
    }

    const response = await fetch('/api/vault/storage/summary', {
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to fetch storage summary')
    return response.json()
  },

  async reconcileStorage(token?: string): Promise<{ summary: StorageSummary }> {
    if (getDataMode() === 'demo') {
      return { summary: demoVaultStore.getStorageSummary() }
    }

    const response = await fetch('/api/vault/storage/reconcile', {
      method: 'POST',
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to reconcile storage')
    return response.json()
  },

  async getApplicationDocuments(applicationId: string, token?: string): Promise<any[]> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.getApplicationDocuments(applicationId)
    }

    const response = await fetch(`/api/vault/applications/${applicationId}/documents`, {
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to fetch application documents')
    return response.json()
  },

  async linkApplicationDocument(
    applicationId: string,
    data: { vaultFileId: string; resumeVersionId?: string | null; documentRole?: string; notes?: string | null },
    token?: string
  ): Promise<any> {
    if (getDataMode() === 'demo') {
      return demoVaultStore.linkApplicationDocument(applicationId, data)
    }

    const response = await fetch(`/api/vault/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message || 'Failed to attach document to application')
    }
    return response.json()
  },

  async unlinkApplicationDocument(applicationId: string, documentId: string, token?: string): Promise<void> {
    if (getDataMode() === 'demo') {
      demoVaultStore.unlinkApplicationDocument(applicationId, documentId)
      return
    }

    const response = await fetch(`/api/vault/applications/${applicationId}/documents/${documentId}`, {
      method: 'DELETE',
      headers: authHeader(token),
    })
    if (!response.ok) throw new Error('Failed to unlink document')
  },
}
