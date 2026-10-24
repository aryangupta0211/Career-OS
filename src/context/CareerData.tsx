import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { z } from 'zod'
import { demoData } from '../data/demo'
import { CareerDataContext } from './careerDataContext'
import type { CareerDataContextValue } from './careerDataContext'
import type { CareerData } from '../types'

const storageKey = 'careeros-demo-v1'
const storedDateSchema = z.string().refine((value) => value === '' || !Number.isNaN(Date.parse(value)))
const companySchema = z.object({
  id: z.string(), name: z.string(), industry: z.string(), location: z.string(), website: z.string(),
  size: z.string(), tags: z.array(z.string()), careersUrl: z.string(), linkedinUrl: z.string(),
  notes: z.string(), createdAt: storedDateSchema,
})
const applicationSchema = z.object({
  id: z.string(), companyId: z.string(), jobTitle: z.string(),
  status: z.enum(['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected']),
  appliedAt: storedDateSchema, nextAction: z.string(), nextFollowUpAt: storedDateSchema, location: z.string(),
  jobDescription: z.string(), jobUrl: z.string(), applicationUrl: z.string(), jobType: z.string(),
  workArrangement: z.string(), resumeReference: z.string(), notes: z.string(),
})
const contactSchema = z.object({
  id: z.string(), companyId: z.string(), name: z.string(), jobTitle: z.string(),
  status: z.string(), lastContactedAt: storedDateSchema, tags: z.array(z.string()),
  linkedinUrl: z.string(), email: z.string(), phone: z.string(),
  connectionRequestedAt: storedDateSchema, connectionAcceptedAt: storedDateSchema,
  nextFollowUpAt: storedDateSchema, notes: z.string(),
})
const taskSchema = z.object({
  id: z.string(), title: z.string(), companyId: z.string(), dueAt: storedDateSchema,
  priority: z.enum(['Low', 'Medium', 'High']), done: z.boolean(),
  description: z.string(), contactId: z.string(), applicationId: z.string(), category: z.string(),
})
const eventSchema = z.object({
  id: z.string(), title: z.string(), eventType: z.string(), companyId: z.string(),
  startsAt: storedDateSchema, location: z.string(), endsAt: storedDateSchema, meetingUrl: z.string(),
  notes: z.string(), contactId: z.string(), applicationId: z.string(),
})
const activitySchema = z.object({
  id: z.string(), description: z.string(), occurredAt: storedDateSchema, companyId: z.string(),
})
const careerDataSchema = z.object({
  companies: z.array(companySchema),
  applications: z.array(applicationSchema),
  contacts: z.array(contactSchema),
  tasks: z.array(taskSchema),
  events: z.array(eventSchema),
  activities: z.array(activitySchema),
})

function readStoredData(): CareerData {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return demoData
    const parsed: unknown = JSON.parse(stored)
    const result = careerDataSchema.safeParse(parsed)
    if (result.success) return result.data
    console.warn('CareerOS demo data did not match the current format. Starting with fresh sample data.')
  } catch (error) {
    console.warn('CareerOS could not read saved demo data. Starting with fresh sample data.', error)
  }
  return demoData
}

function dateValue(value: string | undefined, fallback: string) {
  if (!value) return fallback
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

export function DemoCareerDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CareerData>(readStoredData)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('CareerOS could not persist demo data in this browser.', error)
    }
  }, [data])

  const value = useMemo<CareerDataContextValue>(() => {
    const addRecord: CareerDataContextValue['addRecord'] = (type, fields) => {
      const id = `${type}-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const companyId = fields.companyId ?? ''
      setData((current) => {
        switch (type) {
          case 'company':
            return { ...current, companies: [{ id, name: fields.name.trim(), industry: fields.industry, location: fields.location, website: fields.website, size: fields.size, tags: fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean), careersUrl: fields.careersUrl, linkedinUrl: fields.linkedinUrl, notes: fields.notes, createdAt: now }, ...current.companies] }
          case 'application':
            return { ...current, applications: [{ id, companyId, jobTitle: fields.jobTitle.trim(), status: fields.status as CareerData['applications'][number]['status'], appliedAt: dateValue(fields.appliedAt, now), nextAction: fields.nextAction, nextFollowUpAt: dateValue(fields.nextFollowUpAt, ''), location: fields.location, jobDescription: fields.jobDescription, jobUrl: fields.jobUrl, applicationUrl: fields.applicationUrl, jobType: fields.jobType, workArrangement: fields.workArrangement, resumeReference: fields.resumeReference, notes: fields.notes }, ...current.applications] }
          case 'contact':
            return { ...current, contacts: [{ id, companyId, name: fields.name.trim(), jobTitle: fields.jobTitle, status: fields.status, lastContactedAt: dateValue(fields.lastContactedAt, now), tags: fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean), linkedinUrl: fields.linkedinUrl, email: fields.email, phone: fields.phone, connectionRequestedAt: dateValue(fields.connectionRequestedAt, ''), connectionAcceptedAt: dateValue(fields.connectionAcceptedAt, ''), nextFollowUpAt: dateValue(fields.nextFollowUpAt, ''), notes: fields.notes }, ...current.contacts] }
          case 'task':
            return { ...current, tasks: [{ id, title: fields.title.trim(), companyId, dueAt: dateValue(fields.dueAt, now), priority: fields.priority as CareerData['tasks'][number]['priority'], done: false, description: fields.description, contactId: fields.contactId, applicationId: fields.applicationId, category: fields.category }, ...current.tasks] }
          case 'event':
            return { ...current, events: [{ id, title: fields.title.trim(), eventType: fields.eventType, companyId, startsAt: dateValue(fields.startsAt, now), location: fields.location, endsAt: dateValue(fields.endsAt, ''), meetingUrl: fields.meetingUrl, notes: fields.notes, contactId: fields.contactId, applicationId: fields.applicationId }, ...current.events] }
        }
      })
    }

    const updateRecord: CareerDataContextValue['updateRecord'] = (type, id, fields) => {
      setData((current) => {
        switch (type) {
          case 'company':
            return { ...current, companies: current.companies.map((item) => item.id === id ? { ...item, name: fields.name.trim(), industry: fields.industry, location: fields.location, website: fields.website, size: fields.size, tags: fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean), careersUrl: fields.careersUrl, linkedinUrl: fields.linkedinUrl, notes: fields.notes } : item) }
          case 'application':
            return { ...current, applications: current.applications.map((item) => item.id === id ? { ...item, companyId: fields.companyId, jobTitle: fields.jobTitle.trim(), status: fields.status as CareerData['applications'][number]['status'], appliedAt: dateValue(fields.appliedAt, item.appliedAt), nextAction: fields.nextAction, nextFollowUpAt: dateValue(fields.nextFollowUpAt, ''), location: fields.location, jobDescription: fields.jobDescription, jobUrl: fields.jobUrl, applicationUrl: fields.applicationUrl, jobType: fields.jobType, workArrangement: fields.workArrangement, resumeReference: fields.resumeReference, notes: fields.notes } : item) }
          case 'contact':
            return { ...current, contacts: current.contacts.map((item) => item.id === id ? { ...item, companyId: fields.companyId, name: fields.name.trim(), jobTitle: fields.jobTitle, status: fields.status, lastContactedAt: dateValue(fields.lastContactedAt, item.lastContactedAt), tags: fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean), linkedinUrl: fields.linkedinUrl, email: fields.email, phone: fields.phone, connectionRequestedAt: dateValue(fields.connectionRequestedAt, ''), connectionAcceptedAt: dateValue(fields.connectionAcceptedAt, ''), nextFollowUpAt: dateValue(fields.nextFollowUpAt, ''), notes: fields.notes } : item) }
          case 'task':
            return { ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, title: fields.title.trim(), companyId: fields.companyId, dueAt: dateValue(fields.dueAt, item.dueAt), priority: fields.priority as CareerData['tasks'][number]['priority'], description: fields.description, contactId: fields.contactId, applicationId: fields.applicationId, category: fields.category } : item) }
          case 'event':
            return { ...current, events: current.events.map((item) => item.id === id ? { ...item, title: fields.title.trim(), eventType: fields.eventType, companyId: fields.companyId, startsAt: dateValue(fields.startsAt, item.startsAt), location: fields.location, endsAt: dateValue(fields.endsAt, ''), meetingUrl: fields.meetingUrl, notes: fields.notes, contactId: fields.contactId, applicationId: fields.applicationId } : item) }
        }
      })
    }

    const deleteRecord: CareerDataContextValue['deleteRecord'] = (type, id) => {
      setData((current) => {
        if (type === 'company') return {
          ...current,
          companies: current.companies.filter((item) => item.id !== id),
          applications: current.applications.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
          contacts: current.contacts.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
          tasks: current.tasks.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
          events: current.events.map((item) => item.companyId === id ? { ...item, companyId: '' } : item),
        }
        if (type === 'application') return {
          ...current,
          applications: current.applications.filter((item) => item.id !== id),
          tasks: current.tasks.map((item) => item.applicationId === id ? { ...item, applicationId: '' } : item),
          events: current.events.map((item) => item.applicationId === id ? { ...item, applicationId: '' } : item),
        }
        if (type === 'contact') return {
          ...current,
          contacts: current.contacts.filter((item) => item.id !== id),
          tasks: current.tasks.map((item) => item.contactId === id ? { ...item, contactId: '' } : item),
          events: current.events.map((item) => item.contactId === id ? { ...item, contactId: '' } : item),
        }
        if (type === 'task') return { ...current, tasks: current.tasks.filter((item) => item.id !== id) }
        return { ...current, events: current.events.filter((item) => item.id !== id) }
      })
    }

    const toggleTask = (id: string) => setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task),
    }))
    return { data, addRecord, updateRecord, deleteRecord, toggleTask }
  }, [data])

  return <CareerDataContext.Provider value={value}>{children}</CareerDataContext.Provider>
}
