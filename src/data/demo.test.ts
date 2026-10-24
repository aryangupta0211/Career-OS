import { describe, expect, it } from 'vitest'
import { demoData, getCompanyName } from './demo'

describe('demo data', () => {
  it('starts with a useful sample workspace and all application statuses', () => {
    expect(demoData.companies).toHaveLength(7)
    expect(demoData.applications.length).toBeGreaterThanOrEqual(10)
    expect(new Set(demoData.applications.map((application) => application.status)).size).toBe(6)
    expect(demoData.contacts.length).toBeGreaterThanOrEqual(8)
    expect(demoData.tasks.length).toBeGreaterThanOrEqual(6)
    expect(demoData.events.length).toBeGreaterThanOrEqual(3)
  })

  it('uses valid company references and a clear fallback for removed companies', () => {
    const companyIds = new Set(demoData.companies.map((company) => company.id))
    for (const record of [...demoData.applications, ...demoData.contacts, ...demoData.tasks, ...demoData.events]) {
      expect(companyIds.has(record.companyId)).toBe(true)
    }
    const contactIds = new Set(demoData.contacts.map((contact) => contact.id))
    const applicationIds = new Set(demoData.applications.map((application) => application.id))
    expect(demoData.tasks.every((task) => !task.contactId || contactIds.has(task.contactId))).toBe(true)
    expect(demoData.tasks.every((task) => !task.applicationId || applicationIds.has(task.applicationId))).toBe(true)
    expect(demoData.events.every((event) => !event.contactId || contactIds.has(event.contactId))).toBe(true)
    expect(demoData.events.every((event) => !event.applicationId || applicationIds.has(event.applicationId))).toBe(true)
    expect(getCompanyName(demoData, 'missing-company')).toBe('Independent')
  })
})
