import { SKILL_DICTIONARY, type SkillDefinition } from './dictionary.js'
import type { MatchedSkill } from '../types.js'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractSnippet(text: string, matchIndex: number, matchLength: number, snippetRadius = 40): string {
  const start = Math.max(0, matchIndex - snippetRadius)
  const end = Math.min(text.length, matchIndex + matchLength + snippetRadius)
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim()
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'
  return snippet
}

// Special regexes for ambiguous short terms to prevent false-positives
const SPECIAL_MATCHERS: Record<string, (text: string) => { index: number; length: number; match: string } | null> = {
  C: (text: string) => {
    // Matches C/C++, C and C++, C, C++, C programming, C language, or " C " flanked by other languages
    const cRegex = /(?:^|[^A-Za-z0-9])(C\/C\+\+|C\s*,\s*C\+\+|C\s+and\s+C\+\+|C\s+language|C\s+programming|ANSI\s+C|(?:Python|Java|Rust|Go|C\+\+)\s*,\s*C(?![A-Za-z0-9])|\bC\s*,\s*(?:Python|Java|Rust|Go|C\+\+))(?:$|[^A-Za-z0-9])/i
    const m = cRegex.exec(text)
    if (m && m[1]) {
      const matchStr = m[1]
      const actualIndex = m.index + m[0].indexOf(matchStr)
      return { index: actualIndex, length: matchStr.length, match: matchStr }
    }
    return null
  },
  'C++': (text: string) => {
    const cppRegex = /(?:^|[^A-Za-z0-9])(C\+\+|CPP|c\s*plus\s*plus)(?:$|[^A-Za-z0-9])/i
    const m = cppRegex.exec(text)
    if (m && m[1]) {
      const matchStr = m[1]
      const actualIndex = m.index + m[0].indexOf(matchStr)
      return { index: actualIndex, length: matchStr.length, match: matchStr }
    }
    return null
  },
  Go: (text: string) => {
    // Matches Golang, Go language, Go developer/engineer, or "Go" capitalized amidst other languages
    const goRegex = /\b(Golang|Go\s+lang(?:uage)?|Go\s+(?:developer|engineer|backend|service)|(?:Python|Java|Rust|C\+\+|Node|Ruby)\s*,\s*Go\b|\bGo\s*,\s*(?:Python|Java|Rust|C\+\+|Node|Ruby))\b/i
    const m = goRegex.exec(text)
    if (m) {
      return { index: m.index, length: m[0].length, match: m[0] }
    }
    // Also match exact case "Go" if preceded/followed by programming terms
    const exactGo = /\bGo\b/
    const mExact = exactGo.exec(text)
    if (mExact) {
      const surrounding = text.slice(Math.max(0, mExact.index - 30), Math.min(text.length, mExact.index + 30)).toLowerCase()
      if (surrounding.includes('code') || surrounding.includes('backend') || surrounding.includes('developer') || surrounding.includes('concurrency')) {
        return { index: mExact.index, length: mExact[0].length, match: mExact[0] }
      }
    }
    return null
  },
  R: (text: string) => {
    // Matches R language, R programming, R/Python, Python and R, R packages, R data
    const rRegex = /\b(R\s+lang(?:uage)?|R\s+programming|R\s+package|R\/Python|Python\s+(?:and|\/)\s*R|data\s+analysis\s+in\s+R)\b/i
    const m = rRegex.exec(text)
    if (m) {
      return { index: m.index, length: m[0].length, match: m[0] }
    }
    return null
  },
  'Next.js': (text: string) => {
    const nextRegex = /\b(Next\.js|NextJS|Next\s+js)\b/i
    const m = nextRegex.exec(text)
    if (m) {
      return { index: m.index, length: m[0].length, match: m[0] }
    }
    return null
  },
  Express: (text: string) => {
    // Matches Express.js, ExpressJS, Express framework, Node/Express, or "Express" near backend/api/node
    const expressRegex = /\b(Express\.js|ExpressJS|Express\s+framework|Node[\s/]+Express|Express[\s/]+Node)\b/i
    const m = expressRegex.exec(text)
    if (m) {
      return { index: m.index, length: m[0].length, match: m[0] }
    }
    const simple = /\bExpress\b/i.exec(text)
    if (simple) {
      const surrounding = text.slice(Math.max(0, simple.index - 40), Math.min(text.length, simple.index + 40)).toLowerCase()
      if (surrounding.includes('node') || surrounding.includes('api') || surrounding.includes('backend') || surrounding.includes('rest') || surrounding.includes('web framework')) {
        return { index: simple.index, length: simple[0].length, match: simple[0] }
      }
    }
    return null
  },
}

export function matchSkillsInText(
  text: string,
  options?: { isRequiredContext?: boolean; dictionary?: SkillDefinition[] }
): MatchedSkill[] {
  if (!text || typeof text !== 'string') return []

  const dictionary = options?.dictionary || SKILL_DICTIONARY
  const results: MatchedSkill[] = []
  const seenSkillNames = new Set<string>()

  for (const skill of dictionary) {
    if (seenSkillNames.has(skill.name)) continue

    // 1. Check special matchers first for high precision
    const specialMatcher = SPECIAL_MATCHERS[skill.name]
    if (specialMatcher) {
      const specialResult = specialMatcher(text)
      if (specialResult) {
        seenSkillNames.add(skill.name)
        results.push({
          name: skill.name,
          category: skill.category,
          confidence: 0.95,
          evidence: extractSnippet(text, specialResult.index, specialResult.length),
          aliasMatched: specialResult.match,
          isRequired: options?.isRequiredContext,
        })
        continue
      }
      // If special matcher is defined and did not match, skip standard naive regex for this dangerous short term
      if (skill.name === 'C' || skill.name === 'Go' || skill.name === 'R') {
        continue
      }
    }

    // 2. Exact skill name regex (case-insensitive with word boundaries)
    const exactPattern = new RegExp(`\\b${escapeRegex(skill.name)}\\b`, 'i')
    const exactMatch = exactPattern.exec(text)

    if (exactMatch) {
      seenSkillNames.add(skill.name)
      results.push({
        name: skill.name,
        category: skill.category,
        confidence: 1.0,
        evidence: extractSnippet(text, exactMatch.index, exactMatch[0].length),
        aliasMatched: exactMatch[0],
        isRequired: options?.isRequiredContext,
      })
      continue
    }

    // 3. Aliases regex
    if (skill.aliases && skill.aliases.length > 0) {
      let matchedAlias = false
      for (const alias of skill.aliases) {
        // Skip single-character aliases unless specially verified
        if (alias.length <= 1) continue

        const aliasPattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i')
        const aliasMatch = aliasPattern.exec(text)
        if (aliasMatch) {
          seenSkillNames.add(skill.name)
          results.push({
            name: skill.name,
            category: skill.category,
            confidence: 0.9,
            evidence: extractSnippet(text, aliasMatch.index, aliasMatch[0].length),
            aliasMatched: aliasMatch[0],
            isRequired: options?.isRequiredContext,
          })
          matchedAlias = true
          break
        }
      }
      if (matchedAlias) continue
    }
  }

  return results
}
