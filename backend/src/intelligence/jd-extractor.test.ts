import { describe, it, expect } from 'vitest'
import { extractJDFromText } from './jd-extractor.js'

describe('JD Extractor', () => {
  const sampleJD = `
Job Title: Senior Backend Engineer
Company: Stripe
Location: San Francisco, CA
Employment Type: Full-time
Workplace: Remote

About Stripe:
At Stripe, we build financial infrastructure for the internet.

Responsibilities:
• Architect and scale distributed payment processing systems.
• Design robust RESTful APIs and gRPC microservices.
• Collaborate with cross-functional teams across engineering and product.

Requirements:
• 5+ years of experience in backend software engineering.
• Bachelor's degree in Computer Science or equivalent practical experience.
• Strong proficiency in Java, SQL, and Docker.
• Hands-on experience with PostgreSQL and distributed systems design.

Preferred Qualifications:
• Experience with Kafka or message queues.
• Familiarity with Kubernetes and AWS infrastructure.
• Knowledge of Python or Go.

Compensation:
Salary range: $160,000 - $190,000 per year.
Application Deadline: December 31, 2026.
`

  it('extracts structured metadata accurately', () => {
    const extracted = extractJDFromText(sampleJD)

    expect(extracted.jobTitle?.value).toBe('Senior Backend Engineer')
    expect(extracted.companyName?.value).toBe('Stripe')
    expect(extracted.location?.value).toBe('San Francisco, CA')
    expect(extracted.employmentType?.value).toBe('Full-time')
    expect(extracted.workArrangement?.value).toBe('Remote')
    expect(extracted.experienceRequirements?.value).toContain('5+ years')
    expect(extracted.educationRequirements?.value).toContain('Computer Science')
    expect(extracted.salary?.value).toContain('$160,000')
    expect(extracted.applicationDeadline?.value).toContain('December 31, 2026')
  })

  it('classifies required vs preferred skills accurately', () => {
    const extracted = extractJDFromText(sampleJD)

    const requiredNames = extracted.requiredSkills.map((s) => s.name)
    const preferredNames = extracted.preferredSkills.map((s) => s.name)

    expect(requiredNames).toContain('Java')
    expect(requiredNames).toContain('SQL')
    expect(requiredNames).toContain('Docker')
    expect(requiredNames).toContain('PostgreSQL')

    expect(preferredNames).toContain('Kafka')
    expect(preferredNames).toContain('Kubernetes')
    expect(preferredNames).toContain('AWS')
  })

  it('extracts responsibility bullet points', () => {
    const extracted = extractJDFromText(sampleJD)
    expect(extracted.responsibilities?.value).toBeDefined()
    expect(extracted.responsibilities?.value.length).toBeGreaterThanOrEqual(2)
    expect(extracted.responsibilities?.value.some((r) => r.includes('payment processing'))).toBe(true)
  })

  it('handles empty or too-short text gracefully without errors', () => {
    const extracted = extractJDFromText('Too short')
    expect(extracted.extractionStatus).toBe('EMPTY')
    expect(extracted.allSkills.length).toBe(0)
    expect(extracted.statusMessage).toBeDefined()
  })
})

