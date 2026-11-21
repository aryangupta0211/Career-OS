import { matchSkillsInText } from './skills/matcher.js'
import type { ExtractedJDData, ExtractedField, MatchedSkill } from './types.js'

function cleanLine(line: string): string {
  return line.replace(/^[\s•\-\*#\d.]+\s*/, '').trim()
}

function extractSectionLines(text: string, headerRegex: RegExp, nextHeaderRegex: RegExp): string[] {
  const match = headerRegex.exec(text)
  if (!match) return []

  const startIdx = match.index + match[0].length
  const restOfText = text.slice(startIdx)
  const nextMatch = nextHeaderRegex.exec(restOfText)
  const sectionContent = nextMatch ? restOfText.slice(0, nextMatch.index) : restOfText

  return sectionContent
    .split('\n')
    .map(cleanLine)
    .filter((line) => line.length > 5 && !line.match(/^[A-Z\s]{3,25}:?$/))
}

export function extractJDFromText(rawText: string): ExtractedJDData {
  const normalizedText = (rawText || '').trim()

  if (!normalizedText || normalizedText.length < 20) {
    return {
      rawText: normalizedText,
      requiredSkills: [],
      preferredSkills: [],
      allSkills: [],
      softSkills: [],
      keywords: [],
      extractionStatus: 'EMPTY',
      statusMessage: 'The provided text is too short or empty for analysis.',
    }
  }

  // --- 1. Basic Metadata Extraction ---
  let jobTitle: ExtractedField<string> | undefined
  let companyName: ExtractedField<string> | undefined
  let location: ExtractedField<string> | undefined
  let employmentType: ExtractedField<string> | undefined
  let workArrangement: ExtractedField<string> | undefined
  let experienceRequirements: ExtractedField<string> | undefined
  let educationRequirements: ExtractedField<string> | undefined
  let salary: ExtractedField<string> | undefined
  let applicationDeadline: ExtractedField<string> | undefined

  // Job Title
  const titleHeaderMatch = /(?:Job\s+Title|Title|Position|Role):\s*([^\n\r]+)/i.exec(normalizedText)
  if (titleHeaderMatch && titleHeaderMatch[1]?.trim()) {
    jobTitle = {
      value: titleHeaderMatch[1].trim(),
      evidence: titleHeaderMatch[0],
      method: 'header',
      confidence: 0.95,
      confirmed: false,
    }
  } else {
    // Scan first 12 lines for prominent role patterns
    const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean)
    const rolePattern = /\b(?:Senior|Junior|Staff|Principal|Lead|Full\s*Stack|Frontend|Backend|Software|DevOps|Site\s+Reliability|Cloud|Data|Mobile|iOS|Android|Machine\s+Learning|AI|Product|Systems)\s+(?:Software\s+)?(?:Engineer|Developer|Architect|Scientist|Specialist|Manager|Consultant|Intern)\b/i
    for (let i = 0; i < Math.min(12, lines.length); i++) {
      const line = lines[i]
      if (!line) continue
      const m = rolePattern.exec(line)
      if (m && line.length < 80) {
        jobTitle = {
          value: line.replace(/^#+\s*/, ''),
          evidence: line,
          method: 'pattern',
          confidence: 0.85,
          confirmed: false,
        }
        break
      }
    }
  }

  // Company Name
  const companyHeaderMatch = /(?:Company|Organization|Employer):\s*([^\n\r]+)/i.exec(normalizedText)
  if (companyHeaderMatch && companyHeaderMatch[1]?.trim()) {
    companyName = {
      value: companyHeaderMatch[1].trim(),
      evidence: companyHeaderMatch[0],
      method: 'header',
      confidence: 0.95,
      confirmed: false,
    }
  } else {
    const atCompanyMatch = /(?:At|About|Join)\s+([A-Z][A-Za-z0-9&.,' ]{2,30})(?:,\s+we|\s+is\s+a|\s+team|\s+technologies)/.exec(normalizedText)
    if (atCompanyMatch && atCompanyMatch[1]?.trim()) {
      companyName = {
        value: atCompanyMatch[1].trim(),
        evidence: atCompanyMatch[0],
        method: 'pattern',
        confidence: 0.8,
        confirmed: false,
      }
    }
  }

  // Location
  const locationHeaderMatch = /(?:Location|Job\s+Location|Workplace):\s*([^\n\r]+)/i.exec(normalizedText)
  if (locationHeaderMatch && locationHeaderMatch[1]?.trim()) {
    location = {
      value: locationHeaderMatch[1].trim(),
      evidence: locationHeaderMatch[0],
      method: 'header',
      confidence: 0.95,
      confirmed: false,
    }
  } else {
    const locationCityMatch = /\b(?:Based in|Located in|Office in)\s+([A-Z][A-Za-z\s,]{3,35})\b/i.exec(normalizedText)
    if (locationCityMatch && locationCityMatch[1]?.trim()) {
      location = {
        value: locationCityMatch[1].trim(),
        evidence: locationCityMatch[0],
        method: 'pattern',
        confidence: 0.8,
        confirmed: false,
      }
    }
  }

  // Employment Type
  const empMatch = /\b(Full[- ]time|Part[- ]time|Contract(?:or)?|Internship|Temporary)\b/i.exec(normalizedText)
  if (empMatch && empMatch[1]) {
    const raw = empMatch[1].toLowerCase()
    const formatted = raw.includes('full') ? 'Full-time' : raw.includes('part') ? 'Part-time' : raw.includes('contract') ? 'Contract' : raw.includes('intern') ? 'Internship' : 'Temporary'
    employmentType = {
      value: formatted,
      evidence: empMatch[0],
      method: 'pattern',
      confidence: 0.9,
      confirmed: false,
    }
  }

  // Work Arrangement (Remote / Hybrid / Onsite)
  const workArrMatch = /\b(Remote(?:-first)?|Hybrid|On[- ]?site|In[- ]?office)\b/i.exec(normalizedText)
  if (workArrMatch && workArrMatch[1]) {
    const raw = workArrMatch[1].toLowerCase()
    const formatted = raw.includes('remote') ? 'Remote' : raw.includes('hybrid') ? 'Hybrid' : 'On-site'
    workArrangement = {
      value: formatted,
      evidence: workArrMatch[0],
      method: 'pattern',
      confidence: 0.9,
      confirmed: false,
    }
  }

  // Experience Requirements
  const expMatch = /(?:(\d+\+?\s*(?:to|-)\s*\d+\s*(?:years|yrs)(?:\s+of)?\s+experience[^\n.]*)|(\d+\+?\s*(?:years|yrs)(?:\s+of)?\s+(?:relevant\s+)?experience[^\n.]*)|(?:Minimum|At least)\s+(\d+\s*(?:years|yrs)[^\n.]*))/i.exec(normalizedText)
  if (expMatch) {
    const val = (expMatch[1] || expMatch[2] || expMatch[3] || expMatch[0]).trim()
    experienceRequirements = {
      value: val,
      evidence: expMatch[0],
      method: 'pattern',
      confidence: 0.9,
      confirmed: false,
    }
  }

  // Education Requirements
  const eduMatch = /(?:(\b(?:Bachelor'?s|Master'?s|Ph\.?D\.?|B\.?S\.?|M\.?S\.?)\b)(?:\s+(?:degree|in))?[^\n.]*(?:Computer\s+Science|Engineering|related\s+field|equivalent)[^\n.]*)|(\bDegree\s+in\s+Computer\s+Science[^\n.]*)|(\bEquivalent\s+practical\s+experience[^\n.]*)/i.exec(normalizedText)
  if (eduMatch) {
    const val = (eduMatch[1] || eduMatch[2] || eduMatch[3] || eduMatch[0]).trim()
    const fullLine = normalizedText.slice(eduMatch.index, normalizedText.indexOf('\n', eduMatch.index) !== -1 ? normalizedText.indexOf('\n', eduMatch.index) : undefined).trim()
    educationRequirements = {
      value: fullLine.length > val.length ? fullLine : val,
      evidence: eduMatch[0],
      method: 'pattern',
      confidence: 0.85,
      confirmed: false,
    }
  }

  // Salary or Compensation
  const salaryMatch = /(?:\$?\d{2,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:k|K)?\s*(?:-|to)\s*\$?\d{2,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:k|K)?(?:\s*(?:USD|per\s+year|annually|\/yr|\/year))?)|(?:\$[\d,]+(?:\s*(?:k|K|per\s+year|annually|\/yr|\/year)))/i.exec(normalizedText)
  if (salaryMatch) {
    salary = {
      value: salaryMatch[0].trim(),
      evidence: salaryMatch[0],
      method: 'pattern',
      confidence: 0.9,
      confirmed: false,
    }
  }

  // Application Deadline
  const deadlineMatch = /(?:Application\s+Deadline|Apply\s+by|Closing\s+Date):\s*([^\n\r]+)/i.exec(normalizedText)
  if (deadlineMatch && deadlineMatch[1]?.trim()) {
    applicationDeadline = {
      value: deadlineMatch[1].trim(),
      evidence: deadlineMatch[0],
      method: 'header',
      confidence: 0.9,
      confirmed: false,
    }
  }

  // --- 2. Section Extraction (Responsibilities, Requirements, Preferred) ---
  const anyHeaderRegex = /\n\s*(?:Responsibilities|What\s+You'll\s+Do|Key\s+Duties|Requirements|Qualifications|What\s+We're\s+Looking\s+For|Preferred\s+Qualifications|Nice\s+to\s+Have|Benefits|About\s+Us):/i

  const respLines = extractSectionLines(
    normalizedText,
    /\n\s*(?:Responsibilities|What\s+You(?:'ll|\s+will)\s+Do|Key\s+Duties|Role\s+Overview|Your\s+Role):?/i,
    anyHeaderRegex
  )

  const reqLines = extractSectionLines(
    normalizedText,
    /\n\s*(?:Requirements|Minimum\s+Qualifications|Basic\s+Qualifications|What\s+We(?:'re|\s+are)\s+Looking\s+For|Required\s+Skills|Must\s+Have):?/i,
    anyHeaderRegex
  )

  const prefLines = extractSectionLines(
    normalizedText,
    /\n\s*(?:Preferred\s+Qualifications|Nice\s+to\s+Have|Bonus\s+Points|Desired\s+Skills|Good\s+to\s+Have):?/i,
    anyHeaderRegex
  )

  // --- 3. Skill & Keyword Matching ---
  const allSkills = matchSkillsInText(normalizedText)

  const reqText = reqLines.join('\n')
  const prefText = prefLines.join('\n')

  const requiredSkills: MatchedSkill[] = []
  const preferredSkills: MatchedSkill[] = []
  const softSkills: MatchedSkill[] = []

  for (const s of allSkills) {
    if (s.category === 'Soft Skills') {
      softSkills.push(s)
      continue
    }

    const inPref = prefText ? matchSkillsInText(prefText).some((ps) => ps.name === s.name) : false
    const inReq = reqText ? matchSkillsInText(reqText).some((rs) => rs.name === s.name) : false

    if (inPref && !inReq) {
      preferredSkills.push({ ...s, isRequired: false })
    } else {
      // If found in requirements or if no section split exists, count as required
      requiredSkills.push({ ...s, isRequired: true })
    }
  }

  // Extract important domain keywords (capitalized tech terms, acronyms, tools)
  const keywordCandidates = new Set<string>()
  const keywordRegex = /\b[A-Z][a-zA-Z0-9+#.-]{2,20}\b/g
  let kwMatch: RegExpExecArray | null
  while ((kwMatch = keywordRegex.exec(normalizedText)) !== null) {
    const kw = kwMatch[0]
    // Filter out common english words
    const common = ['The', 'And', 'For', 'With', 'You', 'Our', 'Will', 'Are', 'This', 'Have', 'Work', 'Team', 'About', 'Join', 'Please', 'Apply']
    if (!common.includes(kw) && kw.length >= 3) {
      keywordCandidates.add(kw)
    }
  }

  // Limit keywords to top 15 most relevant
  const keywords = Array.from(keywordCandidates).slice(0, 15)

  return {
    jobTitle,
    companyName,
    location,
    employmentType,
    workArrangement,
    experienceRequirements,
    educationRequirements,
    salary,
    applicationDeadline,
    responsibilities: respLines.length > 0 ? { value: respLines, method: 'section', confidence: 0.9 } : undefined,
    requiredQualifications: reqLines.length > 0 ? { value: reqLines, method: 'section', confidence: 0.9 } : undefined,
    preferredQualifications: prefLines.length > 0 ? { value: prefLines, method: 'section', confidence: 0.85 } : undefined,
    requiredSkills,
    preferredSkills,
    allSkills,
    softSkills,
    keywords,
    rawText: normalizedText,
    extractionStatus: 'COMPLETED',
  }
}
