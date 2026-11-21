import { SKILL_DICTIONARY } from './skills/dictionary.js'
import type { PreparationTaskSuggestion, PreparationScheduleConfig } from './types.js'

export function generatePreparationTasks(
  skills: { name: string; isRequired?: boolean }[],
  options?: {
    jobTitle?: string
    companyName?: string
    scheduleConfig?: PreparationScheduleConfig
  }
): PreparationTaskSuggestion[] {
  const tasks: PreparationTaskSuggestion[] = []
  const seenSkills = new Set<string>()

  // Prioritize required skills first
  const sortedSkills = [...skills].sort((a, b) => (b.isRequired ? 1 : 0) - (a.isRequired ? 1 : 0))

  let dayOffset = 1
  for (const item of sortedSkills) {
    const norm = item.name.trim()
    if (!norm || seenSkills.has(norm.toLowerCase())) continue
    seenSkills.add(norm.toLowerCase())

    const dictEntry = SKILL_DICTIONARY.find(
      (d) => d.name.toLowerCase() === norm.toLowerCase() || d.aliases?.some((a) => a.toLowerCase() === norm.toLowerCase())
    )

    const topics = dictEntry?.preparationTopics || [
      `Review core principles and practical patterns for ${norm}`,
      `Prepare 2-3 project examples utilizing ${norm}`,
      `Practice common interview technical questions on ${norm}`,
    ]

    const isSoftSkill = dictEntry?.category === 'Soft Skills'
    const isDSA = norm.toLowerCase().includes('algorithm') || norm.toLowerCase() === 'dsa'
    const isSystemDesign = norm.toLowerCase().includes('system design') || norm.toLowerCase().includes('distributed')

    let category = 'Technical Prep'
    if (isSoftSkill) category = 'Behavioral Prep'
    else if (isDSA) category = 'DSA Practice'
    else if (isSystemDesign) category = 'System Design'

    const priority: 'High' | 'Medium' | 'Low' = item.isRequired ? 'High' : 'Medium'
    const subtopicSnippet = topics.slice(0, 3).join(', ')

    tasks.push({
      id: `prep-${tasks.length + 1}-${norm.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      title: `Revise ${norm}: ${subtopicSnippet}`,
      description: `Structured preparation for ${options?.jobTitle || 'target role'}${options?.companyName ? ` at ${options.companyName}` : ''}.\n\nFocus Areas:\n${topics.map((t) => `• ${t}`).join('\n')}`,
      skill: norm,
      category,
      priority,
      estimatedHours: isDSA || isSystemDesign ? 4 : 2,
      suggestedDueOffsetDays: dayOffset,
      subtopics: topics,
      selected: true,
    })

    // Advance scheduling offset
    dayOffset += 2
  }

  // Adjust schedule if specific constraints were provided
  if (options?.scheduleConfig?.deadlineDate) {
    const deadline = new Date(options.scheduleConfig.deadlineDate)
    const now = new Date()
    const daysAvailable = Math.max(1, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Spread tasks across available days
    const step = Math.max(1, Math.floor(daysAvailable / (tasks.length + 1)))
    tasks.forEach((t, i) => {
      t.suggestedDueOffsetDays = Math.min(daysAvailable, (i + 1) * step)
    })
  }

  return tasks
}

