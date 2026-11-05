import type {
  CompanyResource,
  JobDescription,
  ResumeGroup,
  ResumeVersion,
  StorageSummary,
  VaultFile,
} from '../types'

const initialFiles: VaultFile[] = [
  {
    id: 'demo-file-1',
    originalFilename: 'Aryan_Gupta_Senior_Frontend_v2.0.pdf',
    displayName: 'Frontend Developer Resume (v2.0)',
    storagePath: 'demo/user/Aryan_Gupta_Senior_Frontend_v2.0.pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    fileSizeBytes: 248576,
    category: 'RESUME',
    description: 'Updated with React 19, TypeScript 5.8, and Tailwind v4 highlights.',
    tags: ['React', 'TypeScript', 'Tailwind', 'Frontend'],
    status: 'ACTIVE',
    createdAt: '2026-11-04T10:30:00.000Z',
  },
  {
    id: 'demo-file-2',
    originalFilename: 'Aryan_Gupta_Senior_Frontend_v1.0.pdf',
    displayName: 'Frontend Developer Resume (v1.0)',
    storagePath: 'demo/user/Aryan_Gupta_Senior_Frontend_v1.0.pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    fileSizeBytes: 215400,
    category: 'RESUME',
    description: 'Initial version used for early Q3 applications.',
    tags: ['React', 'TypeScript', 'Redux'],
    status: 'ACTIVE',
    createdAt: '2026-09-12T14:15:00.000Z',
  },
  {
    id: 'demo-file-3',
    originalFilename: 'FullStack_Engineer_Resume_v1.0.pdf',
    displayName: 'Full Stack Engineer Resume (v1.0)',
    storagePath: 'demo/user/FullStack_Engineer_Resume_v1.0.pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    fileSizeBytes: 262144,
    category: 'RESUME',
    description: 'Tailored for Node.js, Express, PostgreSQL and distributed systems.',
    tags: ['Node.js', 'PostgreSQL', 'Express', 'Full Stack'],
    status: 'ACTIVE',
    createdAt: '2026-10-18T09:00:00.000Z',
  },
  {
    id: 'demo-file-4',
    originalFilename: 'Stripe_Staff_Frontend_Spec.pdf',
    displayName: 'JD — Stripe Staff Frontend Engineer',
    storagePath: 'demo/user/Stripe_Staff_Frontend_Spec.pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    fileSizeBytes: 524288,
    category: 'JOB_DESCRIPTION',
    description: 'Full job posting PDF downloaded directly from Stripe careers portal.',
    tags: ['Stripe', 'Fintech', 'Staff Role'],
    status: 'ACTIVE',
    createdAt: '2026-10-22T16:45:00.000Z',
  },
  {
    id: 'demo-file-5',
    originalFilename: 'Vercel_Interview_Prep_Architecture.png',
    displayName: 'System Design Architecture Whiteboard',
    storagePath: 'demo/user/Vercel_Interview_Prep_Architecture.png',
    mimeType: 'image/png',
    extension: '.png',
    fileSizeBytes: 890120,
    category: 'SUPPORTING_DOCUMENT',
    description: 'Diagram of edge cache invalidation strategy for technical screen.',
    tags: ['Interview Prep', 'Architecture'],
    status: 'ACTIVE',
    createdAt: '2026-11-01T11:20:00.000Z',
  },
]

const initialResumeGroups: ResumeGroup[] = [
  {
    id: 'group-fe',
    name: 'Frontend Developer',
    targetRole: 'Senior / Staff Frontend Engineer',
    description: 'Primary resume targeted at high-scale modern web applications and design systems.',
    skills: ['React', 'TypeScript', 'Next.js', 'Vite', 'Tailwind CSS', 'GraphQL'],
    isArchived: false,
    createdAt: '2026-09-10T08:00:00.000Z',
    versions: [
      {
        id: 'v2-fe',
        resumeGroupId: 'group-fe',
        vaultFileId: 'demo-file-1',
        versionNumber: 2,
        versionLabel: 'v2.0',
        description: 'React 19, Next.js 15, and performance optimization focus.',
        skills: ['React', 'TypeScript', 'Performance'],
        isCurrent: true,
        createdAt: '2026-11-04T10:30:00.000Z',
        vaultFile: initialFiles[0],
      },
      {
        id: 'v1-fe',
        resumeGroupId: 'group-fe',
        vaultFileId: 'demo-file-2',
        versionNumber: 1,
        versionLabel: 'v1.0',
        description: 'First version created for Q3 job search.',
        skills: ['React', 'TypeScript'],
        isCurrent: false,
        createdAt: '2026-09-12T14:15:00.000Z',
        vaultFile: initialFiles[1],
      },
    ],
  },
  {
    id: 'group-fs',
    name: 'Full Stack Engineer',
    targetRole: 'Full Stack Engineer / SDE II',
    description: 'Focused on full-stack web architectures, APIs, and relational databases.',
    skills: ['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'React'],
    isArchived: false,
    createdAt: '2026-10-18T09:00:00.000Z',
    versions: [
      {
        id: 'v1-fs',
        resumeGroupId: 'group-fs',
        vaultFileId: 'demo-file-3',
        versionNumber: 1,
        versionLabel: 'v1.0',
        description: 'Initial full-stack resume.',
        skills: ['Node.js', 'PostgreSQL', 'React'],
        isCurrent: true,
        createdAt: '2026-10-18T09:00:00.000Z',
        vaultFile: initialFiles[2],
      },
    ],
  },
]

const initialJobDescriptions: JobDescription[] = [
  {
    id: 'jd-1',
    title: 'Staff Frontend Engineer — Dashboard Experience',
    companyId: 'company-stripe',
    location: 'San Francisco, CA (Remote)',
    experienceLevel: 'Staff (8+ years)',
    employmentType: 'Full-time',
    sourceUrl: 'https://stripe.com/jobs/staff-frontend',
    careerPageUrl: 'https://stripe.com/jobs',
    applicationDeadline: '2026-11-30',
    responsibilities: 'Lead development of next-generation customer reporting and dashboard interfaces.',
    requiredSkills: ['React', 'TypeScript', 'Web Performance', 'Design Systems'],
    preferredSkills: ['KaTeX', 'Canvas/WebGL', 'Microfrontends'],
    descriptionText: 'We are seeking an experienced Staff Frontend Engineer to architect resilient, lightning-fast financial analytics dashboards.',
    notes: 'Strong alignment with our modern React and design system expertise.',
    vaultFileId: 'demo-file-4',
    createdAt: '2026-10-22T16:45:00.000Z',
    company: { id: 'company-stripe', name: 'Stripe' },
    vaultFile: initialFiles[3],
  },
  {
    id: 'jd-2',
    title: 'Senior Software Engineer, Platform',
    companyId: 'company-linear',
    location: 'Remote',
    experienceLevel: 'Senior (5+ years)',
    employmentType: 'Full-time',
    sourceUrl: 'https://linear.app/careers/platform-engineer',
    responsibilities: 'Build real-time synchronization primitives and offline-first client engines.',
    requiredSkills: ['TypeScript', 'Node.js', 'WebSockets', 'PostgreSQL'],
    preferredSkills: ['Local-first architectures', 'CRDTs'],
    descriptionText: 'Help us make software development feel like magic. You will work across client and server syncing systems.',
    notes: 'Opportunity discovered via Twitter/X announcement.',
    createdAt: '2026-10-29T12:00:00.000Z',
    company: { id: 'company-linear', name: 'Linear' },
  },
]

const initialCompanyResources: Record<string, CompanyResource[]> = {
  'company-stripe': [
    {
      id: 'res-stripe-1',
      companyId: 'company-stripe',
      title: 'Stripe Careers Portal',
      url: 'https://stripe.com/jobs',
      description: 'Official careers and listings page',
      resourceType: 'CAREERS_PAGE',
      createdAt: '2026-10-22T16:50:00.000Z',
    },
    {
      id: 'res-stripe-2',
      companyId: 'company-stripe',
      title: 'Stripe Engineering Blog',
      url: 'https://stripe.com/blog/engineering',
      description: 'Technical writeups on infrastructure and UI performance',
      resourceType: 'COMPANY_BLOG',
      createdAt: '2026-10-22T16:52:00.000Z',
    },
  ],
}

// In-memory persistent state for demo mode
let demoFiles = [...initialFiles]
let demoResumeGroups = [...initialResumeGroups]
let demoJobDescriptions = [...initialJobDescriptions]
let demoResources = { ...initialCompanyResources }

export const demoVaultStore = {
  getFiles(filters?: { category?: string; status?: string; search?: string }) {
    let list = demoFiles.filter((f) => f.status !== 'DELETED')
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((f) => f.status === filters.status)
    } else if (!filters?.status) {
      list = list.filter((f) => f.status === 'ACTIVE')
    }
    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter((f) => f.category === filters.category)
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (f) =>
          f.displayName.toLowerCase().includes(q) ||
          f.originalFilename.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          f.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    return list
  },

  getFile(id: string) {
    return demoFiles.find((f) => f.id === id) || null
  },

  uploadFile(file: File, metadata: Partial<VaultFile>) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const newFile: VaultFile = {
      id: `demo-file-${Date.now()}`,
      originalFilename: file.name,
      displayName: metadata.displayName || file.name,
      storagePath: `demo/user/${file.name}`,
      mimeType: file.type || 'application/octet-stream',
      extension: ext,
      fileSizeBytes: file.size,
      category: metadata.category || 'OTHER',
      description: metadata.description || null,
      tags: metadata.tags || [],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    }
    demoFiles.unshift(newFile)
    return newFile
  },

  updateFile(id: string, patch: Partial<VaultFile>) {
    const file = demoFiles.find((f) => f.id === id)
    if (file) {
      Object.assign(file, patch)
    }
    return file || null
  },

  deleteFile(id: string, permanent: boolean = false) {
    const file = demoFiles.find((f) => f.id === id)
    if (!file) return false
    if (permanent || file.status === 'TRASHED') {
      demoFiles = demoFiles.filter((f) => f.id !== id)
    } else {
      file.status = 'TRASHED'
      file.deletedAt = new Date().toISOString()
    }
    return true
  },

  restoreFile(id: string) {
    const file = demoFiles.find((f) => f.id === id)
    if (file) {
      file.status = 'ACTIVE'
      file.deletedAt = null
    }
    return file || null
  },

  getResumeGroups(includeArchived: boolean = false) {
    return demoResumeGroups.filter((g) => includeArchived || !g.isArchived)
  },

  createResumeGroup(data: { name: string; targetRole?: string; description?: string; skills?: string[] }) {
    const group: ResumeGroup = {
      id: `group-${Date.now()}`,
      name: data.name,
      targetRole: data.targetRole || null,
      description: data.description || null,
      skills: data.skills || [],
      isArchived: false,
      createdAt: new Date().toISOString(),
      versions: [],
    }
    demoResumeGroups.unshift(group)
    return group
  },

  uploadResumeVersion(
    groupId: string,
    file: File,
    metadata: { versionLabel?: string; description?: string; skills?: string[]; isCurrent?: boolean },
  ) {
    const group = demoResumeGroups.find((g) => g.id === groupId)
    if (!group) throw new Error('Resume group not found.')

    const vaultFile = this.uploadFile(file, {
      displayName: `${group.name} (${metadata.versionLabel || 'New Version'})`,
      category: 'RESUME',
      description: metadata.description,
      tags: metadata.skills || [],
    })

    const nextVer = group.versions.length + 1
    const isCurrent = metadata.isCurrent ?? (group.versions.length === 0)

    if (isCurrent) {
      for (const v of group.versions) {
        v.isCurrent = false
      }
    }

    const version: ResumeVersion = {
      id: `ver-${Date.now()}`,
      resumeGroupId: groupId,
      vaultFileId: vaultFile.id,
      versionNumber: nextVer,
      versionLabel: metadata.versionLabel || `v${nextVer}.0`,
      description: metadata.description || null,
      skills: metadata.skills || [],
      isCurrent,
      createdAt: new Date().toISOString(),
      vaultFile,
    }

    group.versions.unshift(version)
    return version
  },

  setCurrentResumeVersion(groupId: string, versionId: string) {
    const group = demoResumeGroups.find((g) => g.id === groupId)
    if (!group) return null
    for (const v of group.versions) {
      v.isCurrent = v.id === versionId
    }
    return group
  },

  getJobDescriptions() {
    return [...demoJobDescriptions]
  },

  createJobDescription(data: Partial<JobDescription>, file?: File) {
    let vaultFile: VaultFile | undefined
    if (file) {
      vaultFile = this.uploadFile(file, {
        displayName: `JD — ${data.title}`,
        category: 'JOB_DESCRIPTION',
      })
    }

    const jd: JobDescription = {
      id: `jd-${Date.now()}`,
      title: data.title || 'Untitled Role',
      companyId: data.companyId || null,
      applicationId: data.applicationId || null,
      vaultFileId: vaultFile?.id || data.vaultFileId || null,
      location: data.location || null,
      experienceLevel: data.experienceLevel || null,
      employmentType: data.employmentType || null,
      sourceUrl: data.sourceUrl || null,
      careerPageUrl: data.careerPageUrl || null,
      applicationDeadline: data.applicationDeadline || null,
      responsibilities: data.responsibilities || null,
      requiredSkills: data.requiredSkills || [],
      preferredSkills: data.preferredSkills || [],
      descriptionText: data.descriptionText || null,
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      vaultFile,
    }

    demoJobDescriptions.unshift(jd)
    return jd
  },

  deleteJobDescription(id: string) {
    demoJobDescriptions = demoJobDescriptions.filter((j) => j.id !== id)
    return true
  },

  getCompanyResources(companyId: string) {
    const links = demoResources[companyId] || []
    const documents = demoFiles
      .filter((f) => f.status === 'ACTIVE' && f.companyDocuments?.some((c) => c.companyId === companyId))
      .map((f) => ({ id: `cd-${f.id}`, companyId, vaultFileId: f.id, vaultFile: f, createdAt: f.createdAt }))
    const jobDescriptions = demoJobDescriptions.filter((j) => j.companyId === companyId)

    return { links, documents, jobDescriptions }
  },

  createCompanyResource(companyId: string, resource: Partial<CompanyResource>) {
    if (!demoResources[companyId]) demoResources[companyId] = []
    const res: CompanyResource = {
      id: `res-${Date.now()}`,
      companyId,
      title: resource.title || 'Link',
      url: resource.url || 'https://',
      description: resource.description || null,
      resourceType: resource.resourceType || 'OTHER',
      createdAt: new Date().toISOString(),
    }
    demoResources[companyId].push(res)
    return res
  },

  deleteCompanyResource(companyId: string, resourceId: string) {
    if (demoResources[companyId]) {
      demoResources[companyId] = demoResources[companyId].filter((r) => r.id !== resourceId)
    }
    return true
  },

  getStorageSummary(): StorageSummary {
    const active = demoFiles.filter((f) => f.status === 'ACTIVE')
    const usedBytes = active.reduce((acc, f) => acc + f.fileSizeBytes, 0)
    const totalQuotaBytes = 100 * 1024 * 1024 // 100MB
    const remainingQuotaBytes = Math.max(0, totalQuotaBytes - usedBytes)
    const usagePercentage = Math.min(100, Math.round((usedBytes / totalQuotaBytes) * 100))

    return {
      usedBytes,
      totalQuotaBytes,
      remainingQuotaBytes,
      fileCount: active.length,
      usagePercentage,
      maxFileSizeBytes: 20 * 1024 * 1024,
    }
  },
}

