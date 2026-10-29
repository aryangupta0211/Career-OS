import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { z } from 'zod'
import { demoData } from '../data/demo'
import { CareerDataContext } from './careerDataContext'
import type { CareerDataContextValue } from './careerDataContext'
import type { CareerData } from '../types'
import { isValidStoredDate, normalizeDateOnlyValue, normalizeDateTimeValue } from '../lib/recordValidation'
import { deleteCareerRecord } from '../lib/deleteRecord'

const storageKey = 'careeros-demo-v1'
const storedDateSchema = z.string().refine((value) => value === '' || isValidStoredDate(value))
const companySchema = z.object({
  id: z.string(), name: z.string(), industry: z.string(), location: z.string(), website: z.string(),
  size: z.string(), tags: z.array(z.string()), careersUrl: z.string(), linkedinUrl: z.string(),
  notes: z.string(), createdAt: storedDateSchema,
})
const applicationSchema = z.object({
  id: z.string(), companyId: z.string(), jobTitle: z.string(),
  status: z.enum(['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected']),
  appliedAt: storedDateSchema, nextAction: z.string(), nextFollowUpAt: storedDateSchema, location: z.string(),
  jobDescription: z.string(), prepNotes: z.string().default(''), jobUrl: z.string(), applicationUrl: z.string(), jobType: z.string(),
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
  id: z.string(), type: z.string().default('NOTE'), description: z.string(), occurredAt: storedDateSchema,
  companyId: z.string(), contactId: z.string().default(''), applicationId: z.string().default(''),
})
const careerDataSchema = z.object({
  companies: z.array(companySchema),
  applications: z.array(applicationSchema),
  contacts: z.array(contactSchema),
  tasks: z.array(taskSchema),
  events: z.array(eventSchema),
  activities: z.array(activitySchema),
})

function canonicalizeAllDayDates(data: CareerData): CareerData {
  return {
    ...data,
    applications: data.applications.map((item) => ({
      ...item,
      appliedAt: normalizeDateOnlyValue(item.appliedAt, ''),
      nextFollowUpAt: normalizeDateOnlyValue(item.nextFollowUpAt, ''),
    })),
    contacts: data.contacts.map((item) => ({
      ...item,
      lastContactedAt: normalizeDateOnlyValue(item.lastContactedAt, ''),
      connectionRequestedAt: normalizeDateOnlyValue(item.connectionRequestedAt, ''),
      connectionAcceptedAt: normalizeDateOnlyValue(item.connectionAcceptedAt, ''),
      nextFollowUpAt: normalizeDateOnlyValue(item.nextFollowUpAt, ''),
    })),
    tasks: data.tasks.map((item) => ({ ...item, dueAt: normalizeDateOnlyValue(item.dueAt, '') })),
  }
}

function readStoredData(): CareerData {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return canonicalizeAllDayDates(demoData)
    const parsed: unknown = JSON.parse(stored)
    const result = careerDataSchema.safeParse(parsed)
    if (result.success) return canonicalizeAllDayDates(result.data)
    console.warn('CareerOS demo data did not match the current format. Starting with fresh sample data.')
  } catch (error) {
    console.warn('CareerOS could not read saved demo data. Starting with fresh sample data.', error)
  }
  return demoData
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
            return { ...current, applications: [{ id, companyId, jobTitle: fields.jobTitle.trim(), status: fields.status as CareerData['applications'][number]['status'], appliedAt: normalizeDateOnlyValue(fields.appliedAt, format(new Date(now), 'yyyy-MM-dd')), nextAction: fields.nextAction, nextFollowUpAt: normalizeDateOnlyValue(fields.nextFollowUpAt, ''), location: fields.location, jobDescription: fields.jobDescription, prepNotes: fields.prepNotes, jobUrl: fields.jobUrl, applicationUrl: fields.applicationUrl, jobType: fields.jobType, workArrangement: fields.workArrangement, resumeReference: fields.resumeReference, notes: fields.notes }, ...current.applications] }
          case 'contact':
            return { ...current, contacts: [{ id, companyId, name: fields.name.trim(), jobTitle: fields.jobTitle, status: fields.status, lastContactedAt: normalizeDateOnlyValue(fields.lastContactedAt, format(new Date(now), 'yyyy-MM-dd')), tags: fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean), linkedinUrl: fields.linkedinUrl, email: fields.email, phone: fields.phone, connectionRequestedAt: normalizeDateOnlyValue(fields.connectionRequestedAt, ''), connectionAcceptedAt: normalizeDateOnlyValue(fields.connectionAcceptedAt, ''), nextFollowUpAt: normalizeDateOnlyValue(fields.nextFollowUpAt, ''), notes: fields.notes }, ...current.contacts] }
          case 'task':
            return { ...current, tasks: [{ id, title: fields.title.trim(), companyId, dueAt: normalizeDateOnlyValue(fields.dueAt, format(new Date(now), 'yyyy-MM-dd')), priority: fields.priority as CareerData['tasks'][number]['priority'], done: false, description: fields.description, contactId: fields.contactId, applicationId: fields.applicationId, category: fields.category }, ...current.tasks] }
          case 'event':
            return { ...current, events: [{ id, title: fields.title.trim(), eventType: fields.eventType, companyId, startsAt: normalizeDateTimeValue(fields.startsAt, now), location: fields.location, endsAt: normalizeDateTimeValue(fields.endsAt, ''), meetingUrl: fields.meetingUrl, notes: fields.notes, contactId: fields.contactId, applicationId: fields.applicationId }, ...current.events] }
        }
      })
    }

    const updateRecord: CareerDataContextValue['updateRecord'] = (type, id, fields) => {
      setData((current) => {
        switch (type) {
          case 'company':
            return { ...current, companies: current.companies.map((item) => item.id === id ? { ...item, name: fields.name.trim(), industry: fields.industry, location: fields.location, website: fields.website, size: fields.size, tags: fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean), careersUrl: fields.careersUrl, linkedinUrl: fields.linkedinUrl, notes: fields.notes } : item) }
          case 'application':
            return { ...current, applications: current.applications.map((item) => item.id === id ? { ...item, companyId: fields.companyId, jobTitle: fields.jobTitle.trim(), status: fields.status as CareerData['applications'][number]['status'], appliedAt: normalizeDateOnlyValue(fields.appliedAt, item.appliedAt), nextAction: fields.nextAction, nextFollowUpAt: normalizeDateOnlyValue(fields.nextFollowUpAt, ''), location: fields.location, jobDescription: fields.jobDescription, prepNotes: fields.prepNotes, jobUrl: fields.jobUrl, applicationUrl: fields.applicationUrl, jobType: fields.jobType, workArrangement: fields.workArrangement, resumeReference: fields.resumeReference, notes: fields.notes } : item) }
          case 'contact':
            return { ...current, contacts: current.contacts.map((item) => item.id === id ? { ...item, companyId: fields.companyId, name: fields.name.trim(), jobTitle: fields.jobTitle, status: fields.status, lastContactedAt: normalizeDateOnlyValue(fields.lastContactedAt, item.lastContactedAt), tags: fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean), linkedinUrl: fields.linkedinUrl, email: fields.email, phone: fields.phone, connectionRequestedAt: normalizeDateOnlyValue(fields.connectionRequestedAt, ''), connectionAcceptedAt: normalizeDateOnlyValue(fields.connectionAcceptedAt, ''), nextFollowUpAt: normalizeDateOnlyValue(fields.nextFollowUpAt, ''), notes: fields.notes } : item) }
          case 'task':
            return { ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, title: fields.title.trim(), companyId: fields.companyId, dueAt: normalizeDateOnlyValue(fields.dueAt, item.dueAt), priority: fields.priority as CareerData['tasks'][number]['priority'], description: fields.description, contactId: fields.contactId, applicationId: fields.applicationId, category: fields.category } : item) }
          case 'event':
            return { ...current, events: current.events.map((item) => item.id === id ? { ...item, title: fields.title.trim(), eventType: fields.eventType, companyId: fields.companyId, startsAt: normalizeDateTimeValue(fields.startsAt, item.startsAt), location: fields.location, endsAt: normalizeDateTimeValue(fields.endsAt, ''), meetingUrl: fields.meetingUrl, notes: fields.notes, contactId: fields.contactId, applicationId: fields.applicationId } : item) }
        }
      })
    }

    const deleteRecord: CareerDataContextValue['deleteRecord'] = (type, id) => setData((current) => deleteCareerRecord(current, type, id))

    const toggleTask = (id: string) => setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task),
    }))
    return {
      data,
      dataLoading: false,
      dataError: '',
      dataRetryLabel: 'Try again',
      retryDataLoad: () => setData(readStoredData()),
      addRecord,
      updateRecord,
      deleteRecord,
      toggleTask,
    }
  }, [data])

  return <CareerDataContext.Provider value={value}>{children}</CareerDataContext.Provider>
}
