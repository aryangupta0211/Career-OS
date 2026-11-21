import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../db/client.js'
import { requireAuth } from '../auth/middleware.js'

const text = z.string().max(20_000)
const optionalDate = text.refine((value) => {
  if (!value) return true
  const parsed = new Date(`${value}T12:00:00.000Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'Expected a valid date in YYYY-MM-DD format.')
const optionalDateTime = text.refine(
  (value) => !value || z.iso.datetime({ offset: true }).safeParse(value).success,
  'Expected a valid ISO date and time.',
)
const optionalEmail = text.refine((value) => !value || z.email().safeParse(value).success, 'Expected a valid email address.')
const url = text.refine((value) => {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}, 'Expected an http or https URL.')

const schemas = {
  company: z.object({
    name: text.trim().min(1).max(200), industry: text, location: text, website: url,
    size: text, tags: text, careersUrl: url, linkedinUrl: url, notes: text,
  }).strict(),
  application: z.object({
    jobTitle: text.trim().min(1).max(200), companyId: text.min(1),
    status: z.enum(['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected']),
    appliedAt: optionalDate, nextAction: text, nextFollowUpAt: optionalDate, location: text,
    jobDescription: text, prepNotes: text, jobUrl: url, applicationUrl: url,
    jobType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Other']),
    workArrangement: z.enum(['On-site', 'Hybrid', 'Remote']), resumeReference: text, notes: text,
  }).strict(),
  contact: z.object({
    name: text.trim().min(1).max(200), jobTitle: text, companyId: text,
    status: z.enum(['Connected', 'Requested', 'Not connected']), lastContactedAt: optionalDate,
    tags: text, linkedinUrl: url, email: optionalEmail, phone: text.max(40),
    connectionRequestedAt: optionalDate, connectionAcceptedAt: optionalDate,
    nextFollowUpAt: optionalDate, notes: text,
  }).strict(),
  task: z.object({
    title: text.trim().min(1).max(200), companyId: text, dueAt: optionalDate,
    priority: z.enum(['Low', 'Medium', 'High']), done: z.boolean().optional(),
    description: text, contactId: text, applicationId: text, category: text,
  }).strict(),
  event: z.object({
    title: text.trim().min(1).max(200),
    eventType: z.enum(['Interview', 'Assessment', 'Networking', 'Other']),
    companyId: text, startsAt: optionalDateTime.refine((value) => Boolean(value), 'Event start is required.'),
    location: text, endsAt: optionalDateTime, meetingUrl: url, notes: text,
    contactId: text, applicationId: text,
  }).strict(),
}

type RecordKind = keyof typeof schemas
type Transaction = Prisma.TransactionClient
type ParsedRecord =
  | { kind: 'company'; data: z.infer<typeof schemas.company> }
  | { kind: 'application'; data: z.infer<typeof schemas.application> }
  | { kind: 'contact'; data: z.infer<typeof schemas.contact> }
  | { kind: 'task'; data: z.infer<typeof schemas.task> }
  | { kind: 'event'; data: z.infer<typeof schemas.event> }

class NotFoundError extends Error {}
class InvalidRelationError extends Error {}

function nullable(value: string) {
  return value.trim() ? value.trim() : null
}

function dateOnly(value: string) {
  if (!value) return null
  const parsed = new Date(`${value}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed
}

function dateTime(value: string) {
  return value ? new Date(value) : null
}

function dateString(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? ''
}

function dateTimeString(value: Date | null) {
  return value?.toISOString() ?? ''
}

function toApplicationStatus(value: string) {
  return value.toUpperCase() as 'SAVED' | 'APPLIED' | 'ASSESSMENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED'
}

function fromApplicationStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function toWorkArrangement(value: string) {
  return value.replace('-', '').replace('Onsite', 'ONSITE').toUpperCase() as 'ONSITE' | 'HYBRID' | 'REMOTE'
}

function toJobType(value: string) {
  return value.replace('-', '_').toUpperCase() as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'OTHER'
}

function fromEnum(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function toContactStatus(value: string): 'NOT_CONNECTED' | 'REQUESTED' | 'CONNECTED' {
  if (value === 'Not connected') return 'NOT_CONNECTED'
  return value === 'Connected' ? 'CONNECTED' : 'REQUESTED'
}

function fromContactStatus(value: string) {
  if (value === 'NOT_CONNECTED') return 'Not connected'
  return value === 'CONNECTED' ? 'Connected' : 'Requested'
}

function toTaskPriority(value: string) {
  return value.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH'
}

function toEventType(value: string) {
  return value.toUpperCase() as 'INTERVIEW' | 'ASSESSMENT' | 'NETWORKING' | 'OTHER'
}

function companyDto(record: {
  id: string; name: string; industry: string | null; location: string | null; website: string | null
  size: string | null; tags: string[]; careersUrl: string | null; linkedinUrl: string | null
  notes: string | null; createdAt: Date
}) {
  return {
    id: record.id, name: record.name, industry: record.industry ?? '', location: record.location ?? '',
    website: record.website ?? '', size: record.size ?? '', tags: record.tags,
    careersUrl: record.careersUrl ?? '', linkedinUrl: record.linkedinUrl ?? '',
    notes: record.notes ?? '', createdAt: record.createdAt.toISOString(),
  }
}

function applicationDto(record: {
  id: string; companyId: string | null; jobTitle: string; status: string; appliedAt: Date | null
  nextAction: string | null; nextFollowUpAt: Date | null; location: string | null
  jobDescription: string | null; prepNotes: string | null; jobUrl: string | null
  applicationUrl: string | null; jobType: string | null; workArrangement: string | null
  resumeReference: string | null; notes: string | null
}) {
  return {
    id: record.id, companyId: record.companyId ?? '', jobTitle: record.jobTitle,
    status: fromApplicationStatus(record.status), appliedAt: dateString(record.appliedAt),
    nextAction: record.nextAction ?? '', nextFollowUpAt: dateString(record.nextFollowUpAt),
    location: record.location ?? '', jobDescription: record.jobDescription ?? '',
    prepNotes: record.prepNotes ?? '', jobUrl: record.jobUrl ?? '', applicationUrl: record.applicationUrl ?? '',
    jobType: record.jobType ? fromEnum(record.jobType).replace('Full Time', 'Full-time').replace('Part Time', 'Part-time') : '',
    workArrangement: record.workArrangement ? fromEnum(record.workArrangement).replace('Onsite', 'On-site') : '',
    resumeReference: record.resumeReference ?? '', notes: record.notes ?? '',
  }
}

function contactDto(record: {
  id: string; companyId: string | null; name: string; jobTitle: string | null
  connectionStatus: string; lastContactedAt: Date | null; tags: string[]
  linkedinUrl: string | null; email: string | null; phone: string | null
  connectionRequestedAt: Date | null; connectionAcceptedAt: Date | null
  nextFollowUpAt: Date | null; notes: string | null
}) {
  return {
    id: record.id, companyId: record.companyId ?? '', name: record.name,
    jobTitle: record.jobTitle ?? '', status: fromContactStatus(record.connectionStatus),
    lastContactedAt: dateString(record.lastContactedAt), tags: record.tags,
    linkedinUrl: record.linkedinUrl ?? '', email: record.email ?? '', phone: record.phone ?? '',
    connectionRequestedAt: dateString(record.connectionRequestedAt),
    connectionAcceptedAt: dateString(record.connectionAcceptedAt),
    nextFollowUpAt: dateString(record.nextFollowUpAt), notes: record.notes ?? '',
  }
}

function taskDto(record: {
  id: string; title: string; companyId: string | null; dueAt: Date | null; priority: string
  status: string; description: string | null; contactId: string | null
  applicationId: string | null; category: string | null
}) {
  return {
    id: record.id, title: record.title, companyId: record.companyId ?? '',
    dueAt: dateString(record.dueAt), priority: fromEnum(record.priority),
    done: record.status === 'COMPLETED', description: record.description ?? '',
    contactId: record.contactId ?? '', applicationId: record.applicationId ?? '',
    category: record.category ?? '',
  }
}

function eventDto(record: {
  id: string; title: string; eventType: string; companyId: string | null; startsAt: Date
  location: string | null; endsAt: Date | null; meetingUrl: string | null; notes: string | null
  contactId: string | null; applicationId: string | null
}) {
  return {
    id: record.id, title: record.title, eventType: fromEnum(record.eventType),
    companyId: record.companyId ?? '', startsAt: dateTimeString(record.startsAt),
    location: record.location ?? '', endsAt: dateTimeString(record.endsAt),
    meetingUrl: record.meetingUrl ?? '', notes: record.notes ?? '',
    contactId: record.contactId ?? '', applicationId: record.applicationId ?? '',
  }
}

async function assertOwnedRelations(
  transaction: Transaction,
  userId: string,
  relationIds: { companyId?: string; contactId?: string; applicationId?: string },
) {
  if (relationIds.companyId && !await transaction.company.findFirst({ where: { id: relationIds.companyId, userId }, select: { id: true } })) throw new InvalidRelationError()
  if (relationIds.contactId && !await transaction.contact.findFirst({ where: { id: relationIds.contactId, userId }, select: { id: true } })) throw new InvalidRelationError()
  if (relationIds.applicationId && !await transaction.jobApplication.findFirst({ where: { id: relationIds.applicationId, userId }, select: { id: true } })) throw new InvalidRelationError()
}

function parseRecord(kind: RecordKind, input: unknown):
  | { success: true; record: ParsedRecord }
  | { success: false; error: z.ZodError } {
  switch (kind) {
    case 'company': {
      const result = schemas.company.safeParse(input)
      return result.success ? { success: true, record: { kind, data: result.data } } : result
    }
    case 'application': {
      const result = schemas.application.safeParse(input)
      return result.success ? { success: true, record: { kind, data: result.data } } : result
    }
    case 'contact': {
      const result = schemas.contact.safeParse(input)
      return result.success ? { success: true, record: { kind, data: result.data } } : result
    }
    case 'task': {
      const result = schemas.task.safeParse(input)
      return result.success ? { success: true, record: { kind, data: result.data } } : result
    }
    case 'event': {
      const result = schemas.event.safeParse(input)
      return result.success ? { success: true, record: { kind, data: result.data } } : result
    }
  }
}

function companyData(data: Extract<ParsedRecord, { kind: 'company' }>['data']) {
  return {
    name: data.name, industry: nullable(data.industry), location: nullable(data.location),
    website: nullable(data.website), size: nullable(data.size),
    tags: data.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    careersUrl: nullable(data.careersUrl), linkedinUrl: nullable(data.linkedinUrl), notes: nullable(data.notes),
  }
}

function applicationData(data: Extract<ParsedRecord, { kind: 'application' }>['data']) {
  return {
    jobTitle: data.jobTitle, companyId: data.companyId, status: toApplicationStatus(data.status),
    appliedAt: dateOnly(data.appliedAt), nextAction: nullable(data.nextAction),
    nextFollowUpAt: dateOnly(data.nextFollowUpAt), location: nullable(data.location),
    jobDescription: nullable(data.jobDescription), prepNotes: nullable(data.prepNotes),
    jobUrl: nullable(data.jobUrl), applicationUrl: nullable(data.applicationUrl),
    jobType: toJobType(data.jobType), workArrangement: toWorkArrangement(data.workArrangement),
    resumeReference: nullable(data.resumeReference), notes: nullable(data.notes),
  }
}

function contactData(data: Extract<ParsedRecord, { kind: 'contact' }>['data']) {
  return {
    name: data.name, jobTitle: nullable(data.jobTitle), companyId: nullable(data.companyId),
    connectionStatus: toContactStatus(data.status), lastContactedAt: dateOnly(data.lastContactedAt),
    tags: data.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    linkedinUrl: nullable(data.linkedinUrl), email: nullable(data.email), phone: nullable(data.phone),
    connectionRequestedAt: dateOnly(data.connectionRequestedAt),
    connectionAcceptedAt: dateOnly(data.connectionAcceptedAt), nextFollowUpAt: dateOnly(data.nextFollowUpAt),
    notes: nullable(data.notes),
  }
}

function taskData(data: Extract<ParsedRecord, { kind: 'task' }>['data']) {
  return {
    title: data.title, companyId: nullable(data.companyId), dueAt: dateOnly(data.dueAt),
    priority: toTaskPriority(data.priority), ...(data.done === undefined ? {} : { status: data.done ? 'COMPLETED' as const : 'TODO' as const }),
    description: nullable(data.description), contactId: nullable(data.contactId),
    applicationId: nullable(data.applicationId), category: nullable(data.category),
  }
}

function eventData(data: Extract<ParsedRecord, { kind: 'event' }>['data']) {
  return {
    title: data.title, eventType: toEventType(data.eventType), companyId: nullable(data.companyId),
    startsAt: dateTime(data.startsAt)!, endsAt: dateTime(data.endsAt),
    location: nullable(data.location), meetingUrl: nullable(data.meetingUrl), notes: nullable(data.notes),
    contactId: nullable(data.contactId), applicationId: nullable(data.applicationId),
  }
}

function relationIds(record: ParsedRecord) {
  switch (record.kind) {
    case 'company': return {}
    case 'application': return { companyId: record.data.companyId }
    case 'contact': return { companyId: record.data.companyId }
    case 'task': return { companyId: record.data.companyId, contactId: record.data.contactId, applicationId: record.data.applicationId }
    case 'event': return { companyId: record.data.companyId, contactId: record.data.contactId, applicationId: record.data.applicationId }
  }
}

export const dataRouter = Router()
dataRouter.use(requireAuth)

dataRouter.get('/', async (request, response) => {
  const userId = request.auth?.userId
  if (!userId) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid account is required.' } })
    return
  }
  const prisma = getPrismaClient()
  const [companies, applications, contacts, tasks, events, activities] = await Promise.all([
    prisma.company.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.contact.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.event.findMany({ where: { userId }, orderBy: { startsAt: 'asc' } }),
    prisma.activity.findMany({ where: { userId }, orderBy: { occurredAt: 'desc' } }),
  ])
  response.json({
    companies: companies.map(companyDto),
    applications: applications.map(applicationDto),
    contacts: contacts.map(contactDto),
    tasks: tasks.map(taskDto),
    events: events.map(eventDto),
    activities: activities.map((item) => ({
      id: item.id, type: item.type, description: item.description,
      occurredAt: item.occurredAt.toISOString(), companyId: item.companyId ?? '',
      contactId: item.contactId ?? '', applicationId: item.applicationId ?? '',
    })),
  })
})

dataRouter.post('/:kind', async (request, response) => {
  const userId = request.auth?.userId
  const kindResult = z.enum(['company', 'application', 'contact', 'task', 'event']).safeParse(request.params.kind)
  if (!userId) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid account is required.' } })
    return
  }
  if (!kindResult.success) {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record type not found.' } })
    return
  }
  const kind = kindResult.data
  const parsed = parseRecord(kind, request.body)
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_RECORD', message: 'The record data is invalid.', issues: parsed.error.issues } })
    return
  }
  const prisma = getPrismaClient()
  try {
    const record = await prisma.$transaction(async (transaction) => {
      const { record } = parsed
      await assertOwnedRelations(transaction, userId, relationIds(record))
      switch (record.kind) {
        case 'company': return transaction.company.create({ data: { ...companyData(record.data), userId } })
        case 'application': return transaction.jobApplication.create({ data: { ...applicationData(record.data), userId } })
        case 'contact': return transaction.contact.create({ data: { ...contactData(record.data), userId } })
        case 'task': return transaction.task.create({ data: { ...taskData(record.data), status: record.data.done ? 'COMPLETED' : 'TODO', userId } })
        case 'event': return transaction.event.create({ data: { ...eventData(record.data), userId } })
      }
    })
    response.status(201).json({ id: record.id })
  } catch (error) {
    if (error instanceof InvalidRelationError) {
      response.status(404).json({ error: { code: 'RELATED_RECORD_NOT_FOUND', message: 'A related record was not found.' } })
      return
    }
    throw error
  }
})

dataRouter.patch('/:kind/:id', async (request, response) => {
  const userId = request.auth?.userId
  const kindResult = z.enum(['company', 'application', 'contact', 'task', 'event']).safeParse(request.params.kind)
  if (!userId) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid account is required.' } })
    return
  }
  if (!kindResult.success) {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record type not found.' } })
    return
  }
  const kind = kindResult.data
  const parsed = parseRecord(kind, request.body)
  if (!parsed.success) {
    response.status(400).json({ error: { code: 'INVALID_RECORD', message: 'The record data is invalid.', issues: parsed.error.issues } })
    return
  }
  const prisma = getPrismaClient()
  try {
    await prisma.$transaction(async (transaction) => {
      const { record } = parsed
      await assertOwnedRelations(transaction, userId, relationIds(record))
      const where = { id: request.params.id!, userId }
      let updated: { count: number }
      switch (record.kind) {
        case 'company': updated = await transaction.company.updateMany({ where, data: companyData(record.data) }); break
        case 'application': updated = await transaction.jobApplication.updateMany({ where, data: applicationData(record.data) }); break
        case 'contact': updated = await transaction.contact.updateMany({ where, data: contactData(record.data) }); break
        case 'task': {
          const current = await transaction.task.findFirst({ where, select: { status: true } })
          if (!current) throw new NotFoundError()
          updated = await transaction.task.updateMany({
            where,
            data: { ...taskData(record.data), status: record.data.done === undefined ? current.status : record.data.done ? 'COMPLETED' : 'TODO' },
          })
          break
        }
        case 'event': updated = await transaction.event.updateMany({ where, data: eventData(record.data) }); break
      }
      if (!updated.count) throw new NotFoundError()
    })
    response.status(204).end()
  } catch (error) {
    if (error instanceof InvalidRelationError) {
      response.status(404).json({ error: { code: 'RELATED_RECORD_NOT_FOUND', message: 'A related record was not found.' } })
      return
    }
    if (error instanceof NotFoundError) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } })
      return
    }
    throw error
  }
})

dataRouter.delete('/:kind/:id', async (request, response) => {
  const userId = request.auth?.userId
  const kindResult = z.enum(['company', 'application', 'contact', 'task', 'event']).safeParse(request.params.kind)
  if (!userId) {
    response.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'A valid account is required.' } })
    return
  }
  if (!kindResult.success) {
    response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record type not found.' } })
    return
  }
  const prisma = getPrismaClient()
  await prisma.$transaction(async (transaction) => {
    const id = request.params.id!
    if (kindResult.data === 'company') {
      await transaction.contact.updateMany({ where: { userId, companyId: id }, data: { companyId: null } })
      await transaction.jobApplication.updateMany({ where: { userId, companyId: id }, data: { companyId: null } })
      await transaction.task.updateMany({ where: { userId, companyId: id }, data: { companyId: null } })
      await transaction.event.updateMany({ where: { userId, companyId: id }, data: { companyId: null } })
      await transaction.activity.updateMany({ where: { userId, companyId: id }, data: { companyId: null } })
    } else if (kindResult.data === 'contact') {
      await transaction.task.updateMany({ where: { userId, contactId: id }, data: { contactId: null } })
      await transaction.event.updateMany({ where: { userId, contactId: id }, data: { contactId: null } })
      await transaction.activity.updateMany({ where: { userId, contactId: id }, data: { contactId: null } })
    } else if (kindResult.data === 'application') {
      await transaction.task.updateMany({ where: { userId, applicationId: id }, data: { applicationId: null } })
      await transaction.event.updateMany({ where: { userId, applicationId: id }, data: { applicationId: null } })
      await transaction.activity.updateMany({ where: { userId, applicationId: id }, data: { applicationId: null } })
    }
    let deleted: { count: number }
    switch (kindResult.data) {
      case 'company': deleted = await transaction.company.deleteMany({ where: { id, userId } }); break
      case 'application': deleted = await transaction.jobApplication.deleteMany({ where: { id, userId } }); break
      case 'contact': deleted = await transaction.contact.deleteMany({ where: { id, userId } }); break
      case 'task': deleted = await transaction.task.deleteMany({ where: { id, userId } }); break
      case 'event': deleted = await transaction.event.deleteMany({ where: { id, userId } }); break
    }
    if (!deleted.count) throw new NotFoundError()
  }).catch((error: unknown) => {
    if (error instanceof NotFoundError) {
      response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found.' } })
      return
    }
    throw error
  })
  if (!response.headersSent) response.status(204).end()
})
