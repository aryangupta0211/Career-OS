export interface ExtractedField<T = string> {
  value: T
  evidence?: string
  method: 'pattern' | 'section' | 'dictionary' | 'header' | 'heuristic'
  confidence: number // 0.0 - 1.0
  confirmed?: boolean
}

export interface MatchedSkill {
  name: string
  category: string
  confidence: number
  evidence?: string
  aliasMatched?: string
  isRequired?: boolean
}

export interface ExtractedJDData {
  jobTitle?: ExtractedField<string>
  companyName?: ExtractedField<string>
  location?: ExtractedField<string>
  employmentType?: ExtractedField<string>
  workArrangement?: ExtractedField<string>
  experienceRequirements?: ExtractedField<string>
  educationRequirements?: ExtractedField<string>
  salary?: ExtractedField<string>
  applicationDeadline?: ExtractedField<string>
  responsibilities?: ExtractedField<string[]>
  requiredQualifications?: ExtractedField<string[]>
  preferredQualifications?: ExtractedField<string[]>
  requiredSkills: MatchedSkill[]
  preferredSkills: MatchedSkill[]
  allSkills: MatchedSkill[]
  softSkills: MatchedSkill[]
  keywords: string[]
  rawText: string
  extractionStatus: 'COMPLETED' | 'PARTIAL' | 'EMPTY' | 'UNSUPPORTED'
  statusMessage?: string
}

export interface ResumeMatchScore {
  resumeVersionId: string
  resumeGroupId: string
  resumeLabel: string
  targetRole?: string
  score: number // 0 to 100
  dimensions: {
    requiredSkillCoverage: number // 0 to 100
    preferredSkillCoverage: number // 0 to 100
    roleSimilarity: number // 0 to 100
    keywordCoverage: number // 0 to 100
    experienceRelevance: number // 0 to 100
  }
  matchedSkills: string[]
  missingRequiredSkills: string[]
  missingPreferredSkills: string[]
  matchedKeywords: string[]
  roleTags: string[]
  explanation: string
  relevanceTier: 'High' | 'Medium' | 'Low'
}

export interface PreparationTaskSuggestion {
  id: string
  title: string
  description: string
  skill: string
  category: string
  priority: 'High' | 'Medium' | 'Low'
  estimatedHours: number
  suggestedDueOffsetDays: number
  subtopics: string[]
  selected?: boolean
}

export interface PreparationScheduleConfig {
  deadlineDate?: string
  availableDaysPerWeek?: number
  dailyStudyMinutes?: number
}

export interface DuplicateFileCheckResult {
  isDuplicate: boolean
  sha256Hash: string
  existingFile?: {
    id: string
    displayName: string
    originalFilename: string
    fileSizeBytes: number
    createdAt: string
    category: string
    resumeGroup?: { id: string; name: string }
    companies?: { id: string; name: string }[]
    applications?: { id: string; jobTitle: string }[]
  }
}

export interface DocumentSearchResultItem {
  id: string
  displayName: string
  originalFilename: string
  category: string
  mimeType: string
  fileSizeBytes: number
  createdAt: string
  updatedAt: string
  snippet?: string
  matchType: 'content' | 'metadata' | 'both'
  matchHighlights: string[]
  companyName?: string
  jobTitle?: string
}

export interface SmartReminderItem {
  id: string
  type: 'interview' | 'deadline' | 'follow_up' | 'overdue_task' | 'stale_application' | 'preparation_due' | 'opportunity'
  title: string
  description: string
  severity: 'urgent' | 'warning' | 'info'
  date?: string
  recordId: string
  recordType: 'application' | 'task' | 'event' | 'company'
  actionUrl: string
  actionLabel: string
  reason: string
}

export interface SmartInsightsSummary {
  reminders: SmartReminderItem[]
  stats: {
    activeApplications: number
    applicationsByStatus: Record<string, number>
    upcomingInterviewsCount: number
    pendingFollowUpsCount: number
    overdueTasksCount: number
    preparationProgressPercentage: number
  }
  suggestedActions: SmartReminderItem[]
}

