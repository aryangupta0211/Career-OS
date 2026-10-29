import { format, isValid, parseISO } from 'date-fns'
import { z } from 'zod'
import type { CareerData, RecordType } from '../types'

type References = Pick<CareerData, 'companies' | 'contacts' | 'applications'>

const text = z.string().trim()
const optionalDate = text.refine((value) => value === '' || isValidStoredDate(value), 'Enter a valid date.')
const requiredDateTime = text.refine(isLocalDateTime, 'Enter a valid date and time.')
const optionalUrl = text.refine((value) => value === '' || isHttpUrl(value), 'Enter a valid http or https URL.')
const optionalEmail = text.refine((value) => value === '' || z.email().safeParse(value).success, 'Enter a valid email address.')
const optionalPhone = text.max(40, 'Phone number must be 40 characters or fewer.')

export function isValidStoredDate(value: string) {
  const parsed = parseISO(value)
  return isValid(parsed) && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || format(parsed, 'yyyy-MM-dd') === value)
}

export function normalizeDateOnlyValue(value: string | undefined, fallback: string) {
  if (!value) return fallback
  if (!isValidStoredDate(value)) throw new RangeError('Cannot save an invalid date value.')
  return format(parseISO(value), 'yyyy-MM-dd')
}

function isLocalDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false
  const parsed = parseISO(value)
  return isValid(parsed) && format(parsed, "yyyy-MM-dd'T'HH:mm") === value
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function relationIssue(value: string, ids: Set<string>, message: string, path: string, context: z.RefinementCtx) {
  if (value && !ids.has(value)) context.addIssue({ code: 'custom', path: [path], message })
}

export function createRecordSchema(type: RecordType, references: References) {
  const companyIds = new Set(references.companies.map(({ id }) => id))
  const contactIds = new Set(references.contacts.map(({ id }) => id))
  const applicationIds = new Set(references.applications.map(({ id }) => id))

  switch (type) {
    case 'company':
      return z.object({
        name: text.min(1, 'Enter a company name.').max(200),
        industry: text,
        location: text,
        website: optionalUrl,
        careersUrl: optionalUrl,
        linkedinUrl: optionalUrl,
        size: text,
        tags: text,
        notes: text,
      })
    case 'application':
      return z.object({
        jobTitle: text.min(1, 'Enter a job title.').max(200),
        companyId: text.min(1, 'Select a company.').refine((id) => companyIds.has(id), 'Select an existing company.'),
        status: z.enum(['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected']),
        appliedAt: optionalDate,
        nextAction: text,
        nextFollowUpAt: optionalDate,
        location: text,
        jobUrl: optionalUrl,
        applicationUrl: optionalUrl,
        jobType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Other']),
        workArrangement: z.enum(['On-site', 'Hybrid', 'Remote']),
        resumeReference: text,
        jobDescription: text,
        prepNotes: text,
        notes: text,
      })
    case 'contact':
      return z.object({
        name: text.min(1, 'Enter a contact name.').max(200),
        jobTitle: text,
        companyId: text,
        status: z.enum(['Connected', 'Requested', 'Not connected']),
        lastContactedAt: optionalDate,
        connectionRequestedAt: optionalDate,
        connectionAcceptedAt: optionalDate,
        nextFollowUpAt: optionalDate,
        linkedinUrl: optionalUrl,
        email: optionalEmail,
        phone: optionalPhone,
        tags: text,
        notes: text,
      }).superRefine((value, context) => relationIssue(value.companyId, companyIds, 'Select an existing company.', 'companyId', context))
    case 'task':
      return z.object({
        title: text.min(1, 'Enter a task title.').max(200),
        companyId: text,
        dueAt: optionalDate,
        priority: z.enum(['Low', 'Medium', 'High']),
        category: text,
        contactId: text,
        applicationId: text,
        description: text,
      }).superRefine((value, context) => {
        relationIssue(value.companyId, companyIds, 'Select an existing company.', 'companyId', context)
        relationIssue(value.contactId, contactIds, 'Select an existing contact.', 'contactId', context)
        relationIssue(value.applicationId, applicationIds, 'Select an existing application.', 'applicationId', context)
      })
    case 'event':
      return z.object({
        title: text.min(1, 'Enter an event title.').max(200),
        eventType: z.enum(['Interview', 'Assessment', 'Networking', 'Other']),
        companyId: text,
        startsAt: requiredDateTime,
        endsAt: text.refine((value) => value === '' || isLocalDateTime(value), 'Enter a valid end date and time.'),
        location: text,
        meetingUrl: optionalUrl,
        contactId: text,
        applicationId: text,
        notes: text,
      }).superRefine((value, context) => {
        relationIssue(value.companyId, companyIds, 'Select an existing company.', 'companyId', context)
        relationIssue(value.contactId, contactIds, 'Select an existing contact.', 'contactId', context)
        relationIssue(value.applicationId, applicationIds, 'Select an existing application.', 'applicationId', context)
        if (value.endsAt && value.endsAt < value.startsAt) {
          context.addIssue({ code: 'custom', path: ['endsAt'], message: 'End time must not be before start time.' })
        }
      })
  }
}

export function normalizeDateTimeValue(value: string | undefined, fallback: string) {
  if (!value) return fallback
  if (!isValidStoredDate(value)) throw new RangeError('Cannot save an invalid date value.')
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  if (Number.isNaN(parsed.getTime())) throw new RangeError('Cannot save an invalid date value.')
  return parsed.toISOString()
}
