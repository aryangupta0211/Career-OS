import { describe, it, expect } from 'vitest'
import { matchSkillsInText } from './skills/matcher.js'
import { SKILL_DICTIONARY } from './skills/dictionary.js'

describe('Skill Dictionary & Matcher', () => {
  it('contains comprehensive coverage across tech categories', () => {
    expect(SKILL_DICTIONARY.length).toBeGreaterThan(30)
    const categories = new Set(SKILL_DICTIONARY.map((s) => s.category))
    expect(categories.has('Programming Languages')).toBe(true)
    expect(categories.has('Frontend')).toBe(true)
    expect(categories.has('Backend')).toBe(true)
    expect(categories.has('Databases')).toBe(true)
    expect(categories.has('DevOps & Cloud')).toBe(true)
    expect(categories.has('AI & Machine Learning')).toBe(true)
    expect(categories.has('Soft Skills')).toBe(true)
  })

  it('matches exact skills with evidence snippet', () => {
    const text = 'We require strong experience in React, TypeScript, and PostgreSQL for building scalable web applications.'
    const matches = matchSkillsInText(text)
    const names = matches.map((m) => m.name)

    expect(names).toContain('React')
    expect(names).toContain('TypeScript')
    expect(names).toContain('PostgreSQL')

    const tsMatch = matches.find((m) => m.name === 'TypeScript')
    expect(tsMatch?.evidence).toBeDefined()
    expect(tsMatch?.confidence).toBe(1.0)
  })

  it('recognizes aliases correctly to canonical skill names', () => {
    const text = 'Looking for an engineer skilled in JS, Postgres, K8s, Golang, and ML pipelines.'
    const matches = matchSkillsInText(text)
    const names = matches.map((m) => m.name)

    expect(names).toContain('JavaScript')
    expect(names).toContain('PostgreSQL')
    expect(names).toContain('Kubernetes')
    expect(names).toContain('Go')
    expect(names).toContain('Machine Learning')
  })

  it('avoids false positives for short symbols like C, Go, and R in normal English sentences', () => {
    const text = 'Please go to section c of the report. The candidate has a high grade and will go far in the project.'
    const matches = matchSkillsInText(text)
    const names = matches.map((m) => m.name)

    // Should NOT match C, Go, or R from regular text
    expect(names).not.toContain('C')
    expect(names).not.toContain('Go')
    expect(names).not.toContain('R')
  })

  it('correctly matches C when framed in programming contexts', () => {
    const text1 = 'Requirements: C/C++, Linux kernel development, and embedded systems.'
    const matches1 = matchSkillsInText(text1)
    expect(matches1.map((m) => m.name)).toContain('C')
    expect(matches1.map((m) => m.name)).toContain('C++')

    const text2 = 'Must know Python, Java, C, and Rust.'
    const matches2 = matchSkillsInText(text2)
    expect(matches2.map((m) => m.name)).toContain('C')
  })

  it('correctly matches Go when framed as Golang or programming language', () => {
    const text = 'We write microservices in Go, Java, and Python. Solid knowledge of Golang concurrency is desired.'
    const matches = matchSkillsInText(text)
    expect(matches.map((m) => m.name)).toContain('Go')
  })
})

