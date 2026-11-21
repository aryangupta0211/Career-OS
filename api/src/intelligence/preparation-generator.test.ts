import { describe, it, expect } from 'vitest'
import { generatePreparationTasks } from './preparation-generator.js'

describe('Preparation Generator', () => {
  it('generates structured preparation tasks from technical skills', () => {
    const skills = [
      { name: 'Java', isRequired: true },
      { name: 'SQL', isRequired: true },
      { name: 'Docker', isRequired: false },
    ]

    const tasks = generatePreparationTasks(skills, {
      jobTitle: 'Backend Engineer',
      companyName: 'Acme Corp',
    })

    expect(tasks.length).toBe(3)
    const javaTask = tasks.find((t) => t.skill === 'Java')
    expect(javaTask).toBeDefined()
    expect(javaTask?.priority).toBe('High')
    expect(javaTask?.title).toContain('Java')
    expect(javaTask?.description).toContain('Backend Engineer at Acme Corp')
    expect(javaTask?.subtopics.length).toBeGreaterThanOrEqual(3)

    const dockerTask = tasks.find((t) => t.skill === 'Docker')
    expect(dockerTask?.priority).toBe('Medium')
  })

  it('correctly maps DSA and Soft Skills to appropriate categories', () => {
    const skills = [
      { name: 'Data Structures and Algorithms', isRequired: true },
      { name: 'Communication', isRequired: false },
    ]

    const tasks = generatePreparationTasks(skills)
    const dsaTask = tasks.find((t) => t.skill.includes('Algorithm'))
    const commTask = tasks.find((t) => t.skill === 'Communication')

    expect(dsaTask?.category).toBe('DSA Practice')
    expect(commTask?.category).toBe('Behavioral Prep')
  })

  it('spreads task schedule within given deadline date', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const skills = [
      { name: 'React', isRequired: true },
      { name: 'Node.js', isRequired: true },
      { name: 'PostgreSQL', isRequired: true },
    ]

    const tasks = generatePreparationTasks(skills, {
      scheduleConfig: { deadlineDate: futureDate },
    })

    expect(tasks.length).toBe(3)
    for (const t of tasks) {
      expect(t.suggestedDueOffsetDays).toBeLessThanOrEqual(10)
    }
  })
})

