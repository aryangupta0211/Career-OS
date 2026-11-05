export type ApplicationStatus = 'Saved' | 'Applied' | 'Assessment' | 'Interview' | 'Offer' | 'Rejected'
export type TaskPriority = 'Low' | 'Medium' | 'High'

export interface Company {
  id: string
  name: string
  industry: string
  location: string
  website: string
  size: string
  tags: string[]
  careersUrl: string
  linkedinUrl: string
  notes: string
  createdAt: string
}

export interface Application {
  id: string
  companyId: string
  jobTitle: string
  status: ApplicationStatus
  appliedAt: string
  nextAction: string
  nextFollowUpAt: string
  location: string
  jobDescription: string
  prepNotes: string
  jobUrl: string
  applicationUrl: string
  jobType: string
  workArrangement: string
  resumeReference: string
  notes: string
}

export interface Contact {
  id: string
  companyId: string
  name: string
  jobTitle: string
  status: string
  lastContactedAt: string
  tags: string[]
  linkedinUrl: string
  email: string
  phone: string
  connectionRequestedAt: string
  connectionAcceptedAt: string
  nextFollowUpAt: string
  notes: string
}

export interface FollowUpTask {
  id: string
  title: string
  companyId: string
  dueAt: string
  priority: TaskPriority
  done: boolean
  description: string
  contactId: string
  applicationId: string
  category: string
}

export interface CareerEvent {
  id: string
  title: string
  eventType: string
  companyId: string
  startsAt: string
  location: string
  endsAt: string
  meetingUrl: string
  notes: string
  contactId: string
  applicationId: string
}

export interface Activity {
  id: string
  type: string
  description: string
  occurredAt: string
  companyId: string
  contactId: string
  applicationId: string
}

export interface CareerData {
  companies: Company[]
  applications: Application[]
  contacts: Contact[]
  tasks: FollowUpTask[]
  events: CareerEvent[]
  activities: Activity[]
}

export type RecordType = 'company' | 'application' | 'contact' | 'task' | 'event'
export interface AppShellContext {
  openAdd: (type: RecordType, initialDate?: Date) => void
  setProfileUnsavedChanges: (hasChanges: boolean) => void
}

export type VaultFileCategory =
  | 'RESUME'
  | 'JOB_DESCRIPTION'
  | 'COVER_LETTER'
  | 'PORTFOLIO'
  | 'CERTIFICATE'
  | 'SUPPORTING_DOCUMENT'
  | 'OTHER'

export type VaultFileStatus = 'ACTIVE' | 'TRASHED' | 'DELETED'

export type DocumentRole =
  | 'SUBMITTED_RESUME'
  | 'COVER_LETTER'
  | 'JOB_DESCRIPTION'
  | 'PORTFOLIO'
  | 'CERTIFICATE'
  | 'SUPPORTING_DOCUMENT'
  | 'OTHER'

export type CompanyResourceType =
  | 'OFFICIAL_WEBSITE'
  | 'CAREERS_PAGE'
  | 'LINKEDIN'
  | 'JOB_POSTING'
  | 'COMPANY_BLOG'
  | 'DOCUMENTATION'
  | 'OTHER'

export interface VaultFile {
  id: string
  originalFilename: string
  displayName: string
  storagePath: string
  mimeType: string
  extension: string
  fileSizeBytes: number
  sha256Hash?: string | null
  category: VaultFileCategory
  description?: string | null
  tags: string[]
  uploadSource?: string | null
  status: VaultFileStatus
  deletedAt?: string | null
  createdAt: string
  updatedAt?: string
  companyDocuments?: {
    id: string
    companyId: string
    company?: { id: string; name: string }
  }[]
  applicationDocuments?: {
    id: string
    applicationId: string
    documentRole?: string
    application?: { id: string; jobTitle: string; status: string; appliedAt?: string }
  }[]
  resumeVersions?: {
    id: string
    versionNumber: number
    versionLabel: string
    resumeGroupId: string
    resumeGroup?: { id: string; name: string; targetRole?: string }
  }[]
  jobDescriptions?: {
    id: string
    title: string
  }[]
}

export interface ResumeVersion {
  id: string
  resumeGroupId: string
  vaultFileId: string
  versionNumber: number
  versionLabel: string
  description?: string | null
  skills: string[]
  isCurrent: boolean
  createdAt: string
  vaultFile?: VaultFile
  applicationDocuments?: {
    id: string
    applicationId: string
    application?: { id: string; jobTitle: string; status: string; appliedAt?: string; company?: { id: string; name: string } }
  }[]
}

export interface ResumeGroup {
  id: string
  name: string
  targetRole?: string | null
  description?: string | null
  skills: string[]
  isArchived: boolean
  createdAt: string
  updatedAt?: string
  versions: ResumeVersion[]
}

export interface JobDescription {
  id: string
  companyId?: string | null
  applicationId?: string | null
  vaultFileId?: string | null
  title: string
  location?: string | null
  experienceLevel?: string | null
  employmentType?: string | null
  sourceUrl?: string | null
  careerPageUrl?: string | null
  applicationDeadline?: string | null
  responsibilities?: string | null
  requiredSkills: string[]
  preferredSkills: string[]
  descriptionText?: string | null
  notes?: string | null
  createdAt: string
  company?: { id: string; name: string; location?: string }
  application?: { id: string; jobTitle: string; status: string }
  vaultFile?: VaultFile
}

export interface CompanyResource {
  id: string
  companyId: string
  title: string
  url: string
  description?: string | null
  resourceType: CompanyResourceType
  createdAt: string
}

export interface CompanyDocumentItem {
  id: string
  companyId: string
  vaultFileId?: string | null
  jobDescriptionId?: string | null
  notes?: string | null
  createdAt: string
  vaultFile?: VaultFile
  jobDescription?: JobDescription
}

export interface ApplicationDocumentItem {
  id: string
  applicationId: string
  vaultFileId: string
  resumeVersionId?: string | null
  documentRole: DocumentRole
  notes?: string | null
  createdAt: string
  vaultFile?: VaultFile
  resumeVersion?: ResumeVersion
}

export interface StorageSummary {
  usedBytes: number
  totalQuotaBytes: number
  projectQuotaBytes?: number
  remainingQuotaBytes: number
  fileCount: number
  usagePercentage: number
  maxFileSizeBytes: number
}

