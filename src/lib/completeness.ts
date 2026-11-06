import type { Application } from '../types'

export interface CompletenessResult {
  score: number // 0 to 100
  completedCount: number
  totalCount: number
  missingFields: { field: string; label: string; suggestion: string }[]
  status: 'minimal' | 'good' | 'complete'
}

export function computeApplicationCompleteness(
  app: Partial<Application>,
  options?: { hasLinkedJd?: boolean; hasLinkedDoc?: boolean }
): CompletenessResult {
  const checks = [
    {
      field: 'jobTitle',
      label: 'Job Title',
      suggestion: 'Add the target job title',
      isComplete: Boolean(app.jobTitle && app.jobTitle.trim()),
      weight: 20,
    },
    {
      field: 'companyId',
      label: 'Company',
      suggestion: 'Link to a target company',
      isComplete: Boolean(app.companyId && app.companyId.trim()),
      weight: 20,
    },
    {
      field: 'status',
      label: 'Application Status',
      suggestion: 'Set the current application stage',
      isComplete: Boolean(app.status),
      weight: 15,
    },
    {
      field: 'appliedAt',
      label: 'Application Date',
      suggestion: 'Record the date applied or saved',
      isComplete: Boolean(app.appliedAt && app.appliedAt.trim()),
      weight: 10,
    },
    {
      field: 'resumeReference',
      label: 'Resume Version',
      suggestion: 'Attach or specify the submitted resume version',
      isComplete: Boolean((app.resumeReference && app.resumeReference.trim()) || options?.hasLinkedDoc),
      weight: 15,
    },
    {
      field: 'jobDescription',
      label: 'Job Description',
      suggestion: 'Paste role requirements or link a saved JD',
      isComplete: Boolean((app.jobDescription && app.jobDescription.trim()) || options?.hasLinkedJd),
      weight: 10,
    },
    {
      field: 'jobUrl',
      label: 'Job Posting URL',
      suggestion: 'Save the official job posting link for reference',
      isComplete: Boolean((app.jobUrl && app.jobUrl.trim()) || (app.applicationUrl && app.applicationUrl.trim())),
      weight: 10,
    },
  ]

  let score = 0
  let completedCount = 0
  const missingFields: CompletenessResult['missingFields'] = []

  for (const check of checks) {
    if (check.isComplete) {
      score += check.weight
      completedCount++
    } else {
      missingFields.push({
        field: check.field,
        label: check.label,
        suggestion: check.suggestion,
      })
    }
  }

  let status: CompletenessResult['status'] = 'minimal'
  if (score >= 80) status = 'complete'
  else if (score >= 50) status = 'good'

  return {
    score: Math.min(100, score),
    completedCount,
    totalCount: checks.length,
    missingFields,
    status,
  }
}

