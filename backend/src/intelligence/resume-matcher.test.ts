import { describe, it, expect } from 'vitest'
import { matchResumeToApplication, rankResumesForApplication, type ResumeCandidate } from './resume-matcher.js'

describe('Resume Matcher', () => {
  const context = {
    jobTitle: 'Senior Full Stack Engineer',
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    preferredSkills: ['Docker', 'AWS'],
    keywords: ['Microservices', 'GraphQL'],
  }

  const highMatchCandidate: ResumeCandidate = {
    id: 'rv-1',
    resumeGroupId: 'rg-1',
    versionLabel: 'Full Stack Tech Lead Resume v3',
    targetRole: 'Full Stack Engineer',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
    tags: ['FullStack', 'Web'],
    extractedText: 'Architected microservices using React, Node.js and GraphQL.',
  }

  const lowMatchCandidate: ResumeCandidate = {
    id: 'rv-2',
    resumeGroupId: 'rg-2',
    versionLabel: 'Data Scientist Resume v1',
    targetRole: 'Data Scientist',
    skills: ['Python', 'Pandas', 'PyTorch', 'R'],
    tags: ['DataScience'],
    extractedText: 'Trained machine learning models and deep neural networks in PyTorch.',
  }

  it('calculates weighted score accurately and rates high match accordingly', () => {
    const result = matchResumeToApplication(context, highMatchCandidate)

    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.relevanceTier).toBe('High')
    expect(result.matchedSkills).toContain('React')
    expect(result.matchedSkills).toContain('TypeScript')
    expect(result.matchedSkills).toContain('Node.js')
    expect(result.matchedSkills).toContain('PostgreSQL')
    expect(result.missingRequiredSkills.length).toBe(0)
    expect(result.explanation).toContain('Matches 4/4 required skills')
  })

  it('correctly scores and flags missing required skills for a low match', () => {
    const result = matchResumeToApplication(context, lowMatchCandidate)

    expect(result.score).toBeLessThan(60)
    expect(result.relevanceTier).toBe('Low')
    expect(result.missingRequiredSkills).toContain('React')
    expect(result.missingRequiredSkills).toContain('TypeScript')
    expect(result.missingRequiredSkills).toContain('Node.js')
  })

  it('ranks multiple resumes in descending score order', () => {
    const ranked = rankResumesForApplication(context, [lowMatchCandidate, highMatchCandidate])

    expect(ranked.length).toBe(2)
    expect(ranked[0].resumeVersionId).toBe(highMatchCandidate.id)
    expect(ranked[1].resumeVersionId).toBe(lowMatchCandidate.id)
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('avoids inflated score from repeated keywords', () => {
    const candidateWithRepeats: ResumeCandidate = {
      ...lowMatchCandidate,
      extractedText: 'GraphQL GraphQL GraphQL GraphQL GraphQL Microservices Microservices',
    }
    const scoreNormal = matchResumeToApplication(context, lowMatchCandidate).score
    const scoreRepeated = matchResumeToApplication(context, candidateWithRepeats).score

    // Repeating the same keyword should not drastically blow up the score past required skills
    expect(scoreRepeated).toBeLessThanOrEqual(scoreNormal + 15)
  })
})

