import type { ResumeMatchScore } from './types.js'
import { matchSkillsInText } from './skills/matcher.js'

export interface ResumeMatchingConfig {
  requiredSkillWeight?: number // default 0.45
  preferredSkillWeight?: number // default 0.15
  targetRoleWeight?: number // default 0.20
  keywordWeight?: number // default 0.10
  experienceWeight?: number // default 0.10
}

export interface ApplicationMatchingContext {
  jobTitle: string
  requiredSkills: string[]
  preferredSkills?: string[]
  keywords?: string[]
  experienceYears?: number
}

export interface ResumeCandidate {
  id: string // ResumeVersion.id
  resumeGroupId: string
  versionLabel: string
  targetRole?: string
  skills: string[]
  tags?: string[]
  extractedText?: string
  description?: string
}

function calculateRoleSimilarity(appRole: string, resumeRole?: string): number {
  if (!appRole || !resumeRole) return 0.5 // Neutral baseline if target role is unspecified

  const normApp = appRole.toLowerCase().trim()
  const normResume = resumeRole.toLowerCase().trim()

  if (normApp === normResume) return 1.0

  const appWords = new Set(normApp.split(/[\s,/-]+/).filter((w) => w.length > 2))
  const resumeWords = new Set(normResume.split(/[\s,/-]+/).filter((w) => w.length > 2))

  if (appWords.size === 0 || resumeWords.size === 0) return 0.5

  let intersectionCount = 0
  for (const word of appWords) {
    if (resumeWords.has(word)) intersectionCount++
  }

  const jaccard = intersectionCount / Math.max(appWords.size, resumeWords.size)
  return Math.min(1.0, Math.max(0.2, jaccard * 1.5))
}

export function matchResumeToApplication(
  context: ApplicationMatchingContext,
  resume: ResumeCandidate,
  config: ResumeMatchingConfig = {}
): ResumeMatchScore {
  const reqWeight = config.requiredSkillWeight ?? 0.45
  const prefWeight = config.preferredSkillWeight ?? 0.15
  const roleWeight = config.targetRoleWeight ?? 0.20
  const kwWeight = config.keywordWeight ?? 0.10
  const expWeight = config.experienceWeight ?? 0.10

  // 1. Gather all resume skills (from explicit list, tags, and extracted text)
  const resumeSkillSet = new Set<string>()
  for (const s of resume.skills) {
    if (s && s.trim()) resumeSkillSet.add(s.trim().toLowerCase())
  }
  for (const t of resume.tags || []) {
    if (t && t.trim()) resumeSkillSet.add(t.trim().toLowerCase())
  }
  if (resume.extractedText) {
    const textMatched = matchSkillsInText(resume.extractedText)
    for (const ms of textMatched) {
      resumeSkillSet.add(ms.name.toLowerCase())
    }
  }

  // Helper to test if a skill is in the resume set (exact or alias match)
  const hasSkill = (skillName: string): boolean => {
    const lower = skillName.toLowerCase().trim()
    if (resumeSkillSet.has(lower)) return true

    // Check alias equivalents
    for (const rs of resumeSkillSet) {
      if (rs === lower) return true
      // Handle known two-way aliases (e.g. 'js' and 'javascript', 'ts' and 'typescript')
      if ((lower === 'javascript' && rs === 'js') || (lower === 'js' && rs === 'javascript')) return true
      if ((lower === 'typescript' && rs === 'ts') || (lower === 'ts' && rs === 'typescript')) return true
      if ((lower === 'postgresql' && rs === 'postgres') || (lower === 'postgres' && rs === 'postgresql')) return true
      if ((lower === 'kubernetes' && rs === 'k8s') || (lower === 'k8s' && rs === 'kubernetes')) return true
      if ((lower === 'golang' && rs === 'go') || (lower === 'go' && rs === 'golang')) return true
    }
    return false
  }

  // 2. Required Skills Coverage
  const requiredList = context.requiredSkills || []
  const matchedRequired: string[] = []
  const missingRequired: string[] = []

  for (const skill of requiredList) {
    if (hasSkill(skill)) {
      matchedRequired.push(skill)
    } else {
      missingRequired.push(skill)
    }
  }

  const reqCoverage = requiredList.length > 0 ? (matchedRequired.length / requiredList.length) * 100 : 80

  // 3. Preferred Skills Coverage
  const preferredList = context.preferredSkills || []
  const matchedPreferred: string[] = []
  const missingPreferred: string[] = []

  for (const skill of preferredList) {
    if (hasSkill(skill)) {
      matchedPreferred.push(skill)
    } else {
      missingPreferred.push(skill)
    }
  }

  const prefCoverage = preferredList.length > 0 ? (matchedPreferred.length / preferredList.length) * 100 : 75

  // 4. Role Similarity
  const roleSimFactor = calculateRoleSimilarity(context.jobTitle, resume.targetRole)
  const roleCoverage = roleSimFactor * 100

  // 5. Keyword Coverage (Unique keywords only to prevent frequency inflation)
  const jdKeywords = Array.from(new Set(context.keywords || []))
  const matchedKeywords: string[] = []

  if (jdKeywords.length > 0) {
    const textToSearch = ((resume.extractedText || '') + ' ' + (resume.description || '')).toLowerCase()
    for (const kw of jdKeywords) {
      if (textToSearch.includes(kw.toLowerCase()) || resumeSkillSet.has(kw.toLowerCase())) {
        matchedKeywords.push(kw)
      }
    }
  }

  const kwCoverage = jdKeywords.length > 0 ? (matchedKeywords.length / jdKeywords.length) * 100 : 70

  // 6. Experience relevance (baseline 75 unless explicit mismatch is proven)
  const expCoverage = 75

  // 7. Weighted Total Score
  const rawScore =
    reqCoverage * reqWeight +
    prefCoverage * prefWeight +
    roleCoverage * roleWeight +
    kwCoverage * kwWeight +
    expCoverage * expWeight

  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)))

  const allMatchedSkills = Array.from(new Set([...matchedRequired, ...matchedPreferred]))

  // 8. Generate Human-Readable Explanation
  const explanations: string[] = []
  if (matchedRequired.length > 0) {
    explanations.push(`Matches ${matchedRequired.length}/${requiredList.length} required skills (${matchedRequired.slice(0, 3).join(', ')}${matchedRequired.length > 3 ? '...' : ''}).`)
  }
  if (missingRequired.length > 0) {
    explanations.push(`Missing: ${missingRequired.slice(0, 2).join(', ')}${missingRequired.length > 2 ? '...' : ''}.`)
  }
  if (roleSimFactor >= 0.8) {
    explanations.push(`Target role "${resume.targetRole}" closely aligns with "${context.jobTitle}".`)
  }

  const explanation = explanations.join(' ') || `Covers general requirements with ${finalScore}% overall alignment.`

  const relevanceTier: 'High' | 'Medium' | 'Low' = finalScore >= 75 ? 'High' : finalScore >= 50 ? 'Medium' : 'Low'

  return {
    resumeVersionId: resume.id,
    resumeGroupId: resume.resumeGroupId,
    resumeLabel: resume.versionLabel,
    targetRole: resume.targetRole,
    score: finalScore,
    dimensions: {
      requiredSkillCoverage: Math.round(reqCoverage),
      preferredSkillCoverage: Math.round(prefCoverage),
      roleSimilarity: Math.round(roleCoverage),
      keywordCoverage: Math.round(kwCoverage),
      experienceRelevance: expCoverage,
    },
    matchedSkills: allMatchedSkills,
    missingRequiredSkills: missingRequired,
    missingPreferredSkills: missingPreferred,
    matchedKeywords,
    roleTags: resume.tags || [],
    explanation,
    relevanceTier,
  }
}

export function rankResumesForApplication(
  context: ApplicationMatchingContext,
  resumes: ResumeCandidate[],
  config?: ResumeMatchingConfig
): ResumeMatchScore[] {
  return resumes
    .map((resume) => matchResumeToApplication(context, resume, config))
    .sort((a, b) => b.score - a.score)
}
