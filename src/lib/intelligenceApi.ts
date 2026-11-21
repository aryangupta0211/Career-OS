import { getDataMode } from './supabase'
import type {
  ExtractedJDData,
  ResumeMatchScore,
  PreparationTaskSuggestion,
  DuplicateFileCheckResult,
  DocumentSearchResultItem,
  SmartInsightsSummary,
} from './intelligence/types'
import { extractJDFromText } from './intelligence/jd-extractor'
import { generatePreparationTasks } from './intelligence/preparation-generator'
import { demoVaultStore } from './vaultDemo'

function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const intelligenceApi = {
  async extractJd(
    input: { file?: File; text?: string; vaultFileId?: string },
    token?: string
  ): Promise<{ ok: boolean; data: ExtractedJDData }> {
    if (getDataMode() === 'demo') {
      const text = input.text || 'Senior Full Stack Engineer\nCompany: Demo Corp\nRequirements: React, TypeScript, Node.js, SQL\nSalary: $140,000 - $160,000'
      const extracted = extractJDFromText(text)
      return { ok: true, data: extracted }
    }

    let body: any
    let headers: Record<string, string> = { ...authHeader(token) }

    if (input.file) {
      const formData = new FormData()
      formData.append('file', input.file)
      body = formData
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(input)
    }

    const response = await fetch('/api/intelligence/jd/extract', {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(err.error?.message || 'Failed to extract JD details')
    }

    return response.json()
  },

  async getResumeMatches(applicationId: string, token?: string): Promise<ResumeMatchScore[]> {
    if (getDataMode() === 'demo') {
      return [
        {
          resumeVersionId: 'demo-rv-1',
          resumeGroupId: 'demo-rg-1',
          resumeLabel: 'Full Stack Tech Lead (v2 - Current)',
          targetRole: 'Full Stack Engineer',
          score: 88,
          dimensions: {
            requiredSkillCoverage: 90,
            preferredSkillCoverage: 80,
            roleSimilarity: 95,
            keywordCoverage: 85,
            experienceRelevance: 80,
          },
          matchedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          missingRequiredSkills: [],
          missingPreferredSkills: ['Docker'],
          matchedKeywords: ['Microservices', 'GraphQL'],
          roleTags: ['FullStack', 'Web'],
          explanation: 'Matches 4/4 required skills (React, TypeScript, Node.js...). Role closely aligns with target.',
          relevanceTier: 'High',
        },
        {
          resumeVersionId: 'demo-rv-2',
          resumeGroupId: 'demo-rg-2',
          resumeLabel: 'Backend Specialist (v1)',
          targetRole: 'Backend Engineer',
          score: 68,
          dimensions: {
            requiredSkillCoverage: 60,
            preferredSkillCoverage: 70,
            roleSimilarity: 70,
            keywordCoverage: 65,
            experienceRelevance: 75,
          },
          matchedSkills: ['Node.js', 'PostgreSQL'],
          missingRequiredSkills: ['React'],
          missingPreferredSkills: [],
          matchedKeywords: ['APIs'],
          roleTags: ['Backend'],
          explanation: 'Strong backend coverage but missing frontend framework React.',
          relevanceTier: 'Medium',
        },
      ]
    }

    const response = await fetch(`/api/intelligence/applications/${applicationId}/resume-matches`, {
      headers: authHeader(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to calculate resume matches: ${response.statusText}`)
    }

    const json = await response.json()
    return json.matches || []
  },

  async generatePreparationTasks(
    applicationId: string,
    options?: { skills?: { name: string; isRequired?: boolean }[]; deadlineDate?: string },
    token?: string
  ): Promise<PreparationTaskSuggestion[]> {
    if (getDataMode() === 'demo') {
      const sampleSkills = options?.skills || [
        { name: 'React', isRequired: true },
        { name: 'TypeScript', isRequired: true },
        { name: 'System Design', isRequired: true },
        { name: 'Communication', isRequired: false },
      ]
      return generatePreparationTasks(sampleSkills, {
        jobTitle: 'Target Role',
        scheduleConfig: { deadlineDate: options?.deadlineDate },
      })
    }

    const response = await fetch(`/api/intelligence/applications/${applicationId}/preparation/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(token),
      },
      body: JSON.stringify(options || {}),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate preparation tasks: ${response.statusText}`)
    }

    const json = await response.json()
    return json.tasks || []
  },

  async createPreparationTasks(
    applicationId: string,
    tasks: { title: string; description: string; priority: string; category: string; dueDate?: string }[],
    token?: string
  ): Promise<{ ok: boolean; createdCount: number }> {
    if (getDataMode() === 'demo') {
      return { ok: true, createdCount: tasks.length }
    }

    const response = await fetch(`/api/intelligence/applications/${applicationId}/preparation/create-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader(token),
      },
      body: JSON.stringify({ tasks }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create preparation tasks: ${response.statusText}`)
    }

    return response.json()
  },

  async checkDuplicateFile(
    file: File,
    token?: string
  ): Promise<DuplicateFileCheckResult> {
    if (getDataMode() === 'demo') {
      const files = demoVaultStore.getFiles()
      const existing = files.find(
        (f) => f.originalFilename.toLowerCase() === file.name.toLowerCase() && f.fileSizeBytes === file.size
      )
      if (existing) {
        return {
          isDuplicate: true,
          sha256Hash: 'demo-hash',
          existingFile: {
            id: existing.id,
            displayName: existing.displayName,
            originalFilename: existing.originalFilename,
            fileSizeBytes: existing.fileSizeBytes,
            createdAt: existing.createdAt,
            category: existing.category,
          },
        }
      }
      return { isDuplicate: false, sha256Hash: 'demo-hash' }
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/intelligence/files/check-duplicate', {
      method: 'POST',
      headers: authHeader(token),
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to verify file hash')
    }

    const json = await response.json()
    return json.result
  },

  async searchDocuments(
    params: { query: string; category?: string; extension?: string; page?: number; limit?: number },
    token?: string
  ): Promise<{ items: DocumentSearchResultItem[]; total: number; page: number; limit: number }> {
    if (getDataMode() === 'demo') {
      const files = demoVaultStore.getFiles({ category: params.category, search: params.query })
      const items: DocumentSearchResultItem[] = files.map((f) => ({
        id: f.id,
        displayName: f.displayName,
        originalFilename: f.originalFilename,
        category: f.category,
        mimeType: f.mimeType,
        fileSizeBytes: f.fileSizeBytes,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt || f.createdAt,
        matchType: 'metadata',
        matchHighlights: ['Filename Match'],
        snippet: f.description || undefined,
      }))
      return { items, total: items.length, page: 1, limit: 20 }
    }

    const query = new URLSearchParams()
    if (params.query) query.set('query', params.query)
    if (params.category) query.set('category', params.category)
    if (params.extension) query.set('extension', params.extension)
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))

    const response = await fetch(`/api/intelligence/search?${query.toString()}`, {
      headers: authHeader(token),
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    return response.json()
  },

  async getSmartInsights(token?: string): Promise<SmartInsightsSummary> {
    if (getDataMode() === 'demo') {
      return {
        reminders: [
          {
            id: 'demo-1',
            type: 'interview',
            title: 'Technical Interview with Stripe',
            description: 'Scheduled for 3 days from now. Role: Senior Backend Engineer.',
            severity: 'urgent',
            recordId: 'demo-app-1',
            recordType: 'event',
            actionUrl: '/calendar',
            actionLabel: 'View Schedule',
            reason: 'Interview is scheduled within the next 7 days.',
          },
          {
            id: 'demo-2',
            type: 'overdue_task',
            title: 'Overdue Task: System Design Revision',
            description: 'Targeted preparation for upcoming interview rounds.',
            severity: 'urgent',
            recordId: 'demo-task-1',
            recordType: 'task',
            actionUrl: '/tasks',
            actionLabel: 'Practice Now',
            reason: 'Task deadline has passed.',
          },
          {
            id: 'demo-3',
            type: 'follow_up',
            title: 'Follow up with Alex Smith (Technical Recruiter)',
            description: 'Recruiter follow-up due this week.',
            severity: 'warning',
            recordId: 'demo-contact-1',
            recordType: 'company',
            actionUrl: '/contacts',
            actionLabel: 'Open Contacts',
            reason: 'Scheduled follow-up date reached.',
          },
        ],
        stats: {
          activeApplications: 8,
          applicationsByStatus: { APPLIED: 4, INTERVIEW: 3, SAVED: 1 },
          upcomingInterviewsCount: 2,
          pendingFollowUpsCount: 3,
          overdueTasksCount: 1,
          preparationProgressPercentage: 65,
        },
        suggestedActions: [
          {
            id: 'demo-1',
            type: 'interview',
            title: 'Prepare for Stripe Technical Round',
            description: 'Focus on distributed systems and PostgreSQL.',
            severity: 'urgent',
            recordId: 'demo-app-1',
            recordType: 'event',
            actionUrl: '/tasks',
            actionLabel: 'Practice Now',
            reason: 'Interview in 3 days.',
          },
        ],
      }
    }

    const response = await fetch('/api/intelligence/insights', {
      headers: authHeader(token),
    })

    if (!response.ok) {
      throw new Error(`Failed to load insights: ${response.statusText}`)
    }

    const json = await response.json()
    return json.data
  },
}
