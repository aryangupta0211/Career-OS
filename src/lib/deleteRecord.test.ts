import { describe, expect, it } from 'vitest'
import { demoData } from '../data/demo'
import { deleteCareerRecord } from './deleteRecord'

describe('demo record deletion', () => {
  it('unlinks all optional company references without deleting dependent records', () => {
    const result = deleteCareerRecord(demoData, 'company', 'co-1')
    expect(result.companies.some((item) => item.id === 'co-1')).toBe(false)
    expect(result.applications.find((item) => item.id === 'app-1')?.companyId).toBe('')
    expect(result.contacts.find((item) => item.id === 'ct-1')?.companyId).toBe('')
    expect(result.activities.find((item) => item.id === 'act-2')?.companyId).toBe('')
    expect(result.tasks).toHaveLength(demoData.tasks.length)
    expect(result.events).toHaveLength(demoData.events.length)
  })

  it('unlinks application references from tasks, events, and activities', () => {
    const result = deleteCareerRecord(demoData, 'application', 'app-1')
    expect(result.applications.some((item) => item.id === 'app-1')).toBe(false)
    expect(result.tasks.every((item) => item.applicationId !== 'app-1')).toBe(true)
    expect(result.events.every((item) => item.applicationId !== 'app-1')).toBe(true)
    expect(result.activities.every((item) => item.applicationId !== 'app-1')).toBe(true)
  })

  it('unlinks contact references from tasks, events, and activities', () => {
    const result = deleteCareerRecord(demoData, 'contact', 'ct-1')
    expect(result.contacts.some((item) => item.id === 'ct-1')).toBe(false)
    expect(result.tasks.every((item) => item.contactId !== 'ct-1')).toBe(true)
    expect(result.events.every((item) => item.contactId !== 'ct-1')).toBe(true)
    expect(result.activities.every((item) => item.contactId !== 'ct-1')).toBe(true)
  })
})
