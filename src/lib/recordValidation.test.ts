import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { demoData } from '../data/demo'
import { createRecordSchema, normalizeDateOnlyValue, normalizeDateTimeValue } from './recordValidation'

const references = {
  companies: demoData.companies,
  contacts: demoData.contacts,
  applications: demoData.applications,
}

describe('record validation', () => {
  it('validates company URLs and required names', () => {
    const schema = createRecordSchema('company', references)
    expect(schema.safeParse({ name: 'Acme', industry: '', location: '', website: 'ftp://example.com', careersUrl: '', linkedinUrl: '', size: '', tags: '', notes: '' }).success).toBe(false)
    expect(schema.safeParse({ name: '  ', industry: '', location: '', website: '', careersUrl: '', linkedinUrl: '', size: '', tags: '', notes: '' }).success).toBe(false)
  })

  it('rejects invalid emails and foreign company references', () => {
    const schema = createRecordSchema('contact', references)
    const result = schema.safeParse({
      name: 'Morgan Lee', jobTitle: '', companyId: 'missing-company', status: 'Connected',
      lastContactedAt: '', connectionRequestedAt: '', connectionAcceptedAt: '', nextFollowUpAt: '',
      linkedinUrl: '', email: 'not-an-email', phone: '', tags: '', notes: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map(({ path }) => path[0])).toContain('companyId')
    if (!result.success) expect(result.error.issues.map(({ path }) => path[0])).toContain('email')
  })

  it('validates dates, enum values, and related record references', () => {
    const schema = createRecordSchema('task', references)
    const values = {
      title: 'Follow up', companyId: references.companies[0]!.id, dueAt: '',
      priority: 'Medium', category: '', contactId: '',
      applicationId: '', description: '',
    }
    expect(schema.safeParse({ ...values, dueAt: '2024-02-31' }).success).toBe(false)
    expect(schema.safeParse({ ...values, priority: 'Urgent' }).success).toBe(false)
    const relationResult = schema.safeParse({ ...values, contactId: 'missing-contact' })
    expect(relationResult.success).toBe(false)
    if (!relationResult.success) expect(relationResult.error.issues.map(({ path }) => path[0])).toContain('contactId')
  })

  it('requires a valid event start and rejects end times before the start', () => {
    const schema = createRecordSchema('event', references)
    const result = schema.safeParse({
      title: 'Interview', eventType: 'Interview', companyId: '', startsAt: '2024-02-29T11:00',
      endsAt: '2024-02-29T10:00', location: '', meetingUrl: '', contactId: '', applicationId: '', notes: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some(({ path }) => path[0] === 'endsAt')).toBe(true)
  })

  it('normalizes date-only values without shifting the local calendar day and rejects invalid dates', () => {
    expect(normalizeDateOnlyValue('2024-02-29', '')).toBe('2024-02-29')
    const timestamp = normalizeDateTimeValue('2024-02-29T23:45', '')
    expect(format(new Date(timestamp), "yyyy-MM-dd'T'HH:mm")).toBe('2024-02-29T23:45')
    expect(() => normalizeDateOnlyValue('2024-02-31', '2024-03-01')).toThrow(RangeError)
  })
})
